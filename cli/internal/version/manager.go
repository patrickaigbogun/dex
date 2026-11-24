package version

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/patrickaigbogun/dex/cli/internal/core"
)

func GetDexHome() string {
	if fromEnv := os.Getenv("DEX_HOME"); fromEnv != "" && strings.TrimSpace(fromEnv) != "" {
		if abs, err := filepath.Abs(fromEnv); err == nil {
			return abs
		}
		return fromEnv
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ".dex"
	}
	return filepath.Join(home, ".dex")
}

func GetHostPlatformAsset() (osName, archName, ext, asset string, err error) {
	switch runtime.GOOS {
	case "linux":
		osName = "linux"
	case "darwin":
		osName = "darwin"
	case "windows":
		osName = "windows"
	default:
		return "", "", "", "", fmt.Errorf("unsupported OS platform: %s", runtime.GOOS)
	}

	switch runtime.GOARCH {
	case "amd64":
		archName = "x64"
	case "arm64":
		archName = "arm64"
	default:
		return "", "", "", "", fmt.Errorf("unsupported CPU architecture: %s", runtime.GOARCH)
	}

	if osName == "windows" {
		ext = ".exe"
	} else {
		ext = ""
	}

	asset = fmt.Sprintf("dex-%s-%s%s", osName, archName, ext)
	return osName, archName, ext, asset, nil
}

func SetActiveDexVersion(dexHome, version, ext string) error {
	if err := core.ValidateTag(version); err != nil {
		return err
	}
	versionsDir := filepath.Join(dexHome, "versions")
	targetVersionDir := filepath.Join(versionsDir, version)
	targetBinary := filepath.Join(targetVersionDir, fmt.Sprintf("dex%s", ext))

	if _, err := os.Stat(targetBinary); err != nil {
		return fmt.Errorf("version %s is not installed (expected %s)", version, targetBinary)
	}

	binDir := filepath.Join(dexHome, "bin")
	if err := os.MkdirAll(binDir, 0755); err != nil {
		return err
	}

	currentLink := filepath.Join(dexHome, "current")
	binDex := filepath.Join(binDir, fmt.Sprintf("dex%s", ext))

	// Remove current link if exists
	_ = os.RemoveAll(currentLink)

	if runtime.GOOS == "windows" {
		// On windows attempt junction/symlink or fallback
		_ = os.Symlink(targetVersionDir, currentLink)
		cmdContent := "@echo off\r\n\"%~dp0\\..\\current\\dex.exe\" %*\r\n"
		_ = os.WriteFile(filepath.Join(binDir, "dex.cmd"), []byte(cmdContent), 0755)
	} else {
		if err := os.Symlink(targetVersionDir, currentLink); err != nil {
			// if symlink fails, try removing and recreating
			_ = os.Remove(currentLink)
			if err2 := os.Symlink(targetVersionDir, currentLink); err2 != nil {
				return err2
			}
		}
		_ = os.Remove(binDex)
		if err := os.Symlink(filepath.Join(currentLink, "dex"), binDex); err != nil {
			return err
		}
		_ = os.Chmod(targetBinary, 0755)
	}

	return nil
}

func CmdVersions() error {
	dexHome := GetDexHome()
	versionsDir := filepath.Join(dexHome, "versions")
	if _, err := os.Stat(versionsDir); err != nil {
		fmt.Printf("No versions installed in %s\n", dexHome)
		return nil
	}

	entries, err := os.ReadDir(versionsDir)
	if err != nil {
		return err
	}

	var activeVersion string
	currentLink := filepath.Join(dexHome, "current")
	if target, err := os.Readlink(currentLink); err == nil {
		activeVersion = filepath.Base(target)
	}

	if len(entries) == 0 {
		fmt.Printf("No versions installed in %s\n", dexHome)
		return nil
	}

	fmt.Printf("Dex installed versions (%s):\n\n", dexHome)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		v := entry.Name()
		if v == activeVersion {
			fmt.Printf("  * %s (active)\n", v)
		} else {
			fmt.Printf("    %s\n", v)
		}
	}
	return nil
}

func CmdUse(versionArg string) error {
	if strings.TrimSpace(versionArg) == "" {
		return fmt.Errorf("usage: dex use <version> (e.g. dex use v0.2.0)")
	}
	tag := strings.TrimSpace(versionArg)
	if !strings.HasPrefix(tag, "v") {
		// check if numeric
		if _, _, ok := ParseSemverLikeTag(tag); ok {
			tag = "v" + tag
		}
	}
	if err := core.ValidateTag(tag); err != nil {
		return err
	}
	dexHome := GetDexHome()
	_, _, ext, _, err := GetHostPlatformAsset()
	if err != nil {
		return err
	}
	if err := SetActiveDexVersion(dexHome, tag, ext); err != nil {
		return err
	}
	fmt.Printf("Now using Dex %s ✓\n", tag)
	return nil
}

func CmdVersion(cliVersion string, showTemplate bool, cwd string) error {
	cleanVer := cliVersion
	if strings.HasPrefix(cleanVer, "v") {
		cleanVer = cleanVer[1:]
	}
	fmt.Printf("dex %s\n", cleanVer)

	if showTemplate {
		metaPath := filepath.Join(cwd, ".dex", "metadata.json")
		data, err := os.ReadFile(metaPath)
		if err != nil {
			return fmt.Errorf("not in a scaffolded project (missing .dex/metadata.json)")
		}
		var meta struct {
			TemplateVersion string `json:"templateVersion"`
			Version         string `json:"version"`
		}
		if err := json.Unmarshal(data, &meta); err != nil {
			return fmt.Errorf("invalid .dex/metadata.json: %w", err)
		}
		tVer := meta.TemplateVersion
		if tVer == "" {
			tVer = meta.Version
		}
		if tVer == "" {
			return fmt.Errorf("template version not found in .dex/metadata.json")
		}
		fmt.Printf("template: %s\n", tVer)
	}
	return nil
}

func CmdUpdate(
	targetTag string,
	repo string,
	force bool,
	cliVersion string,
	resolveLatest func(repo string) (string, error),
	downloadFile func(url, dest string) error,
) error {
	if repo == "" {
		repo = "patrickaigbogun/dex"
	}
	dexHome := GetDexHome()
	_, _, ext, asset, err := GetHostPlatformAsset()
	if err != nil {
		return err
	}

	targetTag = strings.TrimSpace(targetTag)
	if targetTag == "" || targetTag == "latest" {
		if resolveLatest == nil {
			resolveLatest = DefaultResolveLatest
		}
		resolved, err := resolveLatest(repo)
		if err != nil {
			return err
		}
		targetTag = resolved
	}

	if !strings.HasPrefix(targetTag, "v") {
		if _, _, ok := ParseSemverLikeTag(targetTag); ok {
			targetTag = "v" + targetTag
		}
	}
	if err := core.ValidateTag(targetTag); err != nil {
		return err
	}

	currentVer := cliVersion
	if currentVer != "" {
		if !strings.HasPrefix(currentVer, "v") {
			currentVer = "v" + currentVer
		}
		if currentVer == targetTag && !force {
			fmt.Printf("Already on %s (latest) ✓\n", targetTag)
			return nil
		}
	}

	versionDir := filepath.Join(dexHome, "versions", targetTag)
	destBinary := filepath.Join(versionDir, fmt.Sprintf("dex%s", ext))

	if err := os.MkdirAll(versionDir, 0755); err != nil {
		return err
	}

	downloadURL := fmt.Sprintf("https://github.com/%s/releases/download/%s/%s", repo, url.PathEscape(targetTag), asset)
	tmpFile := fmt.Sprintf("%s.tmp-%d-%d", destBinary, os.Getpid(), time.Now().UnixNano())

	if downloadFile == nil {
		downloadFile = DefaultDownloadFile
	}

	if err := downloadFile(downloadURL, tmpFile); err != nil {
		_ = os.Remove(tmpFile)
		return fmt.Errorf("failed to download release asset from %s: %w", downloadURL, err)
	}

	if err := os.Rename(tmpFile, destBinary); err != nil {
		_ = os.Remove(tmpFile)
		return err
	}

	if runtime.GOOS != "windows" {
		_ = os.Chmod(destBinary, 0755)
	}

	if err := SetActiveDexVersion(dexHome, targetTag, ext); err != nil {
		return err
	}

	fmt.Printf("\nSuccessfully updated Dex to %s in %s ✓\n", targetTag, dexHome)
	fmt.Printf("Active binary: %s\n", filepath.Join(dexHome, "bin", fmt.Sprintf("dex%s", ext)))
	return nil
}

func DefaultResolveLatest(repo string) (string, error) {
	reqURL := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	if token := os.Getenv("GITHUB_TOKEN"); token != "" {
		if req.URL.Scheme == "https" && (req.URL.Host == "api.github.com" || req.URL.Host == "github.com") {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}
	origHost := req.URL.Host
	client := &http.Client{
		Timeout: 30 * time.Second,
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
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github releases API returned status %d for %s", resp.StatusCode, repo)
	}

	var rel struct {
		TagName string `json:"tag_name"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 10*1024*1024)).Decode(&rel); err != nil {
		return "", err
	}
	if rel.TagName == "" {
		return "", fmt.Errorf("could not find latest release tag for %s", repo)
	}
	if err := core.ValidateTag(rel.TagName); err != nil {
		return "", err
	}
	return rel.TagName, nil
}

func DefaultDownloadFile(downloadURL, dest string) error {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	const maxBinaryBytes = 512 * 1024 * 1024
	n, err := io.Copy(out, io.LimitReader(resp.Body, maxBinaryBytes+1))
	if err != nil {
		return err
	}
	if n > maxBinaryBytes {
		return fmt.Errorf("downloaded file exceeds maximum size of %d bytes", maxBinaryBytes)
	}
	return nil
}

func CmdTag(kind string, cwd string) error {
	if kind != "patch" && kind != "minor" && kind != "major" {
		return fmt.Errorf("invalid tag kind: %s (expected patch, minor, major)", kind)
	}

	cmdList := exec.Command("git", "tag", "--list", "v*")
	cmdList.Dir = cwd
	outBytes, err := cmdList.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to list git tags: %v (%s)", err, string(outBytes))
	}

	lines := strings.Split(string(outBytes), "\n")
	var highest SemverParts
	var hasTag bool

	for _, line := range lines {
		tag := strings.TrimSpace(line)
		if tag == "" {
			continue
		}
		if parts, _, ok := ParseSemverLikeTag(tag); ok {
			if !hasTag || CompareSemver(parts, highest) > 0 {
				highest = parts
				hasTag = true
			}
		}
	}

	if !hasTag {
		highest = SemverParts{0, 0, 0}
	}

	nextParts, err := BumpSemver(highest, kind)
	if err != nil {
		return err
	}

	nextTag := FormatSemverTag(nextParts)

	// Verify nextTag doesn't exist
	cmdCheck := exec.Command("git", "tag", "--list", nextTag)
	cmdCheck.Dir = cwd
	checkOut, err := cmdCheck.Output()
	if err == nil && strings.TrimSpace(string(checkOut)) == nextTag {
		return fmt.Errorf("tag %s already exists", nextTag)
	}

	// Create tag
	cmdTag := exec.Command("git", "tag", nextTag)
	cmdTag.Dir = cwd
	if tagOut, err := cmdTag.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to create git tag %s: %v (%s)", nextTag, err, string(tagOut))
	}

	// Push tag (only if remote origin exists, otherwise skip or handle error in test)
	cmdRemote := exec.Command("git", "remote", "get-url", "origin")
	cmdRemote.Dir = cwd
	if _, err := cmdRemote.CombinedOutput(); err == nil {
		cmdPush := exec.Command("git", "push", "origin", nextTag)
		cmdPush.Dir = cwd
		if pushOut, err := cmdPush.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to push git tag %s: %v (%s)", nextTag, err, string(pushOut))
		}
	}

	fmt.Printf("Successfully tagged and pushed %s ✓\n", nextTag)
	return nil
}
