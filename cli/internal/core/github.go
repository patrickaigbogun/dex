package core

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	defaultTemplateRepo  = "patrickaigbogun/dex"
	maxJSONResponseBytes = 10 * 1024 * 1024
	maxDownloadFileBytes = 512 * 1024 * 1024
)

// ReleaseAsset describes a single GitHub release asset.
type ReleaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

// ReleaseInfo describes a GitHub release response.
type ReleaseInfo struct {
	TagName string         `json:"tag_name"`
	Assets  []ReleaseAsset `json:"assets"`
}

// TemplateDiff describes upstream template file changes and checksums for a release.
type TemplateDiff struct {
	Version         string            `json:"version"`
	PreviousVersion *string           `json:"previousVersion"`
	ChangedFiles    []string          `json:"changedFiles"`
	DeletedFiles    []string          `json:"deletedFiles,omitempty"`
	Checksums       map[string]string `json:"checksums,omitempty"`
}

var (
	repoFormatRe = regexp.MustCompile(`^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$`)
	tagFormatRe  = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$`)
)

func isValidRepo(repo string) bool {
	if !repoFormatRe.MatchString(repo) {
		return false
	}
	parts := strings.SplitN(repo, "/", 2)
	owner, name := parts[0], parts[1]
	if owner == "." || owner == ".." || strings.Contains(owner, "..") {
		return false
	}
	if name == "." || name == ".." || strings.Contains(name, "..") {
		return false
	}
	return true
}

// ValidateTag validates that a release tag is safe for URL and filesystem path usage.
func ValidateTag(tag string) error {
	if !tagFormatRe.MatchString(tag) || strings.Contains(tag, "..") {
		return fmt.Errorf("invalid release tag: %q", tag)
	}
	return nil
}

// RepoFromEnvOrFlag resolves the template GitHub repository from --repo, DEX_TEMPLATE_REPO, or the default.
func RepoFromEnvOrFlag(args ParsedArgs) (string, error) {
	if args.BoolFlags["repo"] && args.Flags["repo"] == "" {
		return "", errors.New("missing template repo: provide --repo <owner/repo> or set DEX_TEMPLATE_REPO")
	}
	repo := args.GetFlag("repo")
	if repo == "" {
		repo = os.Getenv("DEX_TEMPLATE_REPO")
	}
	if repo == "" {
		return defaultTemplateRepo, nil
	}
	if !isValidRepo(repo) {
		return "", fmt.Errorf("invalid --repo format: %s", repo)
	}
	return repo, nil
}

// PackageRepoFromEnvOrFlag resolves the package repository from --packages-repo or DEX_PACKAGE_REPO.
func PackageRepoFromEnvOrFlag(args ParsedArgs) (string, error) {
	if args.BoolFlags["packages-repo"] && args.Flags["packages-repo"] == "" {
		return "", errors.New("missing package repo: provide --packages-repo <owner/repo> or set DEX_PACKAGE_REPO")
	}
	repo := args.GetFlag("packages-repo")
	if repo == "" {
		repo = os.Getenv("DEX_PACKAGE_REPO")
	}
	if repo == "" {
		return "", nil
	}
	if !isValidRepo(repo) {
		return "", fmt.Errorf("invalid package repo format: %s", repo)
	}
	return repo, nil
}

// PackageTagFromEnvOrFlag resolves the package release tag from --packages-tag or DEX_PACKAGE_TAG.
func PackageTagFromEnvOrFlag(args ParsedArgs) string {
	if tag := args.GetFlag("packages-tag"); tag != "" {
		return tag
	}
	return os.Getenv("DEX_PACKAGE_TAG")
}

// FetchTimeout returns the configured HTTP request timeout from DEX_FETCH_TIMEOUT_MS (default 30s).
func FetchTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("DEX_FETCH_TIMEOUT_MS"))
	if raw == "" {
		return 30 * time.Second
	}
	ms, err := strconv.ParseFloat(raw, 64)
	if err != nil || ms < 0 {
		return 30 * time.Second
	}
	if ms == 0 {
		return 1 * time.Nanosecond
	}
	return time.Duration(ms * float64(time.Millisecond))
}

func doRequestWithTimeout(reqURL string, headers map[string]string) (*http.Response, error) {
	timeout := FetchTimeout()
	req, err := http.NewRequest(http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		if req.URL.Scheme == "https" && (req.URL.Host == "api.github.com" || req.URL.Host == "github.com") {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}

	origHost := req.URL.Host
	client := &http.Client{
		Timeout: timeout,
		CheckRedirect: func(r *http.Request, via []*http.Request) error {
			if len(via) >= 10 {
				return errors.New("stopped after 10 redirects")
			}
			if r.URL.Host != origHost || r.URL.Scheme != "https" {
				r.Header.Del("Authorization")
			}
			return nil
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		var netErr interface{ Timeout() bool }
		if errors.As(err, &netErr) && netErr.Timeout() {
			return nil, fmt.Errorf("Request timed out: %s", reqURL)
		}
		if os.IsTimeout(err) {
			return nil, fmt.Errorf("Request timed out: %s", reqURL)
		}
		return nil, err
	}
	return resp, nil
}

// GitHubRelease fetches release metadata for a given repo and tag ("latest" or specific tag).
func GitHubRelease(repo, tag string) (*ReleaseInfo, error) {
	if err := ValidateTag(tag); err != nil {
		return nil, err
	}
	var reqURL string
	if tag == "latest" {
		reqURL = fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)
	} else {
		reqURL = fmt.Sprintf("https://api.github.com/repos/%s/releases/tags/%s", repo, url.PathEscape(tag))
	}

	resp, err := doRequestWithTimeout(reqURL, map[string]string{
		"Accept":               "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, maxJSONResponseBytes))
		return nil, fmt.Errorf("failed to fetch release (%d): %s", resp.StatusCode, string(body))
	}

	var rel ReleaseInfo
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxJSONResponseBytes)).Decode(&rel); err != nil {
		return nil, err
	}
	return &rel, nil
}

// GetLatestReleaseTag returns the tag name of the latest GitHub release for repo.
func GetLatestReleaseTag(repo string) (string, error) {
	rel, err := GitHubRelease(repo, "latest")
	if err != nil {
		return "", err
	}
	if err := ValidateTag(rel.TagName); err != nil {
		return "", err
	}
	return rel.TagName, nil
}

// FetchTemplateDiff downloads and decodes dex-diff-<tag>.json for the given repo and tag.
func FetchTemplateDiff(repo, tag string) (*TemplateDiff, error) {
	if err := ValidateTag(tag); err != nil {
		return nil, err
	}
	escapedTag := url.PathEscape(tag)
	asset := fmt.Sprintf("dex-diff-%s.json", escapedTag)
	reqURL := fmt.Sprintf("https://github.com/%s/releases/download/%s/%s", repo, escapedTag, asset)

	resp, err := doRequestWithTimeout(reqURL, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("failed to fetch template diff (%d): %s", resp.StatusCode, reqURL)
	}

	var diff TemplateDiff
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxJSONResponseBytes)).Decode(&diff); err != nil {
		return nil, err
	}
	return &diff, nil
}

// DownloadToFile streams a remote URL to filePath while reporting progress.
func DownloadToFile(downloadURL, filePath string) error {
	fmt.Printf("   downloading: %s\n", downloadURL)
	resp, err := doRequestWithTimeout(downloadURL, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("download failed (%d): %s", resp.StatusCode, downloadURL)
	}

	out, err := os.Create(filePath)
	if err != nil {
		return err
	}

	totalBytes := resp.ContentLength
	var receivedBytes int64
	lastLog := time.Now()
	buf := make([]byte, 32*1024)
	writeFailed := false

	defer func() {
		out.Close()
		if writeFailed {
			_ = os.Remove(filePath)
		}
	}()

	limitedBody := io.LimitReader(resp.Body, maxDownloadFileBytes+1)
	for {
		n, readErr := limitedBody.Read(buf)
		if n > 0 {
			receivedBytes += int64(n)
			if receivedBytes > maxDownloadFileBytes {
				writeFailed = true
				return fmt.Errorf("download exceeds maximum size of %d bytes: %s", maxDownloadFileBytes, downloadURL)
			}
			if _, wErr := out.Write(buf[:n]); wErr != nil {
				writeFailed = true
				return wErr
			}
			if time.Since(lastLog) > 400*time.Millisecond {
				lastLog = time.Now()
				mb := float64(receivedBytes) / (1024 * 1024)
				if totalBytes > 0 {
					totalMb := float64(totalBytes) / (1024 * 1024)
					pct := int((float64(receivedBytes)/float64(totalBytes))*100 + 0.5)
					fmt.Printf("\r   progress: %.1f MB / %.1f MB (%d%%)", mb, totalMb, pct)
				} else {
					fmt.Printf("\r   progress: %.1f MB", mb)
				}
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			writeFailed = true
			return readErr
		}
	}

	if totalBytes > 0 {
		totalMb := float64(totalBytes) / (1024 * 1024)
		fmt.Printf("\r   progress: %.1f MB / %.1f MB (100%%)\n", totalMb, totalMb)
	} else {
		mb := float64(receivedBytes) / (1024 * 1024)
		fmt.Printf("\r   progress: %.1f MB (done)\n", mb)
	}
	return nil
}

// CacheRootDir returns the root directory used for caching downloaded templates and packages.
func CacheRootDir() string {
	if fromEnv := strings.TrimSpace(os.Getenv("DEX_CACHE_DIR")); fromEnv != "" {
		return fromEnv
	}
	if xdg := strings.TrimSpace(os.Getenv("XDG_CACHE_HOME")); xdg != "" {
		return filepath.Join(xdg, "dex")
	}
	home, _ := os.UserHomeDir()
	switch runtime.GOOS {
	case "darwin":
		return filepath.Join(home, "Library", "Caches", "dex")
	case "windows":
		if local := strings.TrimSpace(os.Getenv("LOCALAPPDATA")); local != "" {
			return filepath.Join(local, "dex", "Cache")
		}
	}
	return filepath.Join(home, ".cache", "dex")
}

func latestCacheTTL() time.Duration {
	raw := strings.TrimSpace(os.Getenv("DEX_TEMPLATE_CACHE_TTL_MS"))
	if raw == "" {
		return 30 * time.Minute
	}
	ms, err := strconv.ParseFloat(raw, 64)
	if err != nil || ms < 0 {
		return 30 * time.Minute
	}
	return time.Duration(ms * float64(time.Millisecond))
}

// CachePathForTemplate returns the cache file path for a GitHub release asset.
func CachePathForTemplate(repo, tag, assetName string) string {
	safeRepo := strings.ReplaceAll(repo, "/", "__")
	safeTag := tag
	if err := ValidateTag(tag); err != nil {
		sum := sha256.Sum256([]byte(tag))
		safeTag = "invalid-" + hex.EncodeToString(sum[:8])
	}
	return filepath.Join(CacheRootDir(), "templates", safeRepo, safeTag, filepath.Base(assetName))
}

// CachePathForTemplateURL returns the cache file path for a direct template URL using its SHA-256 hash.
func CachePathForTemplateURL(rawURL string) string {
	sum := sha256.Sum256([]byte(rawURL))
	hash := hex.EncodeToString(sum[:])
	return filepath.Join(CacheRootDir(), "templates", "url", hash+".tgz")
}

// GetTemplateTgzPath returns the local cached path for a release asset, downloading it if needed.
func GetTemplateTgzPath(repo, tag, assetName string, noCache bool) (string, string, error) {
	if err := ValidateTag(tag); err != nil {
		return "", "", err
	}
	cachePath := CachePathForTemplate(repo, tag, assetName)
	ttl := latestCacheTTL()

	if !noCache {
		if info, err := os.Stat(cachePath); err == nil {
			if tag != "latest" || time.Since(info.ModTime()) <= ttl {
				return cachePath, "hit", nil
			}
		}
	}

	rel, err := GitHubRelease(repo, tag)
	if err != nil {
		return "", "", err
	}

	var downloadURL string
	names := make([]string, 0, len(rel.Assets))
	for _, a := range rel.Assets {
		if a.Name != "" {
			names = append(names, a.Name)
		}
		if a.Name == assetName {
			downloadURL = a.BrowserDownloadURL
		}
	}
	if downloadURL == "" {
		avail := "(none)"
		if len(names) > 0 {
			avail = strings.Join(names, ", ")
		}
		return "", "", fmt.Errorf("missing release asset %s. Available: %s", assetName, avail)
	}

	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		return "", "", err
	}
	tmp := fmt.Sprintf("%s.tmp-%d-%d", cachePath, os.Getpid(), time.Now().UnixNano())
	if err := DownloadToFile(downloadURL, tmp); err != nil {
		_ = os.Remove(tmp)
		return "", "", err
	}
	if err := os.Rename(tmp, cachePath); err != nil {
		_ = os.Remove(tmp)
		return "", "", err
	}
	return cachePath, "miss", nil
}

// GetTemplateTgzPathFromURL returns the local cached path for a template URL, downloading it if needed.
func GetTemplateTgzPathFromURL(rawURL string, noCache bool) (string, string, error) {
	cachePath := CachePathForTemplateURL(rawURL)
	if !noCache {
		if _, err := os.Stat(cachePath); err == nil {
			return cachePath, "hit", nil
		}
	}

	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		return "", "", err
	}
	tmp := fmt.Sprintf("%s.tmp-%d-%d", cachePath, os.Getpid(), time.Now().UnixNano())
	if err := DownloadToFile(rawURL, tmp); err != nil {
		_ = os.Remove(tmp)
		return "", "", err
	}
	if err := os.Rename(tmp, cachePath); err != nil {
		_ = os.Remove(tmp)
		return "", "", err
	}
	return cachePath, "miss", nil
}
