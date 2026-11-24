package core

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func TestParseArgs(t *testing.T) {
	args := ParseArgs([]string{
		"scaffold",
		"my-app",
		"--repo", "owner/repo",
		"--no-install",
		"--fresh",
		"-p",
		"--flag-at-end",
	})

	wantPos := []string{"scaffold", "my-app"}
	if !reflect.DeepEqual(args.Positional, wantPos) {
		t.Fatalf("Positional = %v, want %v", args.Positional, wantPos)
	}
	if args.GetFlag("repo") != "owner/repo" {
		t.Fatalf("repo = %q, want owner/repo", args.GetFlag("repo"))
	}
	if !args.HasFlag("no-install") || !args.BoolFlags["no-install"] {
		t.Fatalf("expected no-install bool flag to be true")
	}
	if !args.HasFlag("fresh") || !args.HasFlag("p") || !args.HasFlag("flag-at-end") {
		t.Fatalf("expected fresh, p, flag-at-end bool flags to be true")
	}

	// Boolean flag before positional arg must NOT consume the positional arg.
	args2 := ParseArgs([]string{"--no-install", "my-app", "--verbose", "true", "--other", "--next"})
	if !reflect.DeepEqual(args2.Positional, []string{"my-app"}) {
		t.Fatalf("Positional = %v, want [my-app]", args2.Positional)
	}
	if !args2.BoolFlags["verbose"] || args2.Flags["verbose"] != "true" {
		t.Fatalf("expected verbose flag=true and boolFlag=true, got %+v", args2)
	}
	if !args2.BoolFlags["other"] || !args2.BoolFlags["next"] {
		t.Fatalf("expected --other followed by --next to both be bool flags, got %+v", args2)
	}
	if got := args2.GetFlag("missing", "verbose"); got != "true" {
		t.Fatalf("GetFlag returned %q, want true", got)
	}
}

func TestSafeJoin(t *testing.T) {
	root := filepath.Join(string(filepath.Separator), "tmp", "dex-root")

	got, err := SafeJoin(root, "src/index.ts")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := filepath.Join(root, "src", "index.ts")
	if got != want {
		t.Fatalf("SafeJoin = %q, want %q", got, want)
	}

	badPaths := []string{
		"../secret",
		"a/../../b",
		"C:foo/bar",
		`a\..\b`,
	}
	for _, p := range badPaths {
		if _, err := SafeJoin(root, p); err == nil {
			t.Errorf("expected error for unsafe path %q, got nil", p)
		}
	}
}

func TestExtractTemplate(t *testing.T) {
	tmpDir := t.TempDir()
	tgzPath := filepath.Join(tmpDir, "template.tgz")

	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)

	entries := []struct {
		name string
		body string
		mode int64
		dir  bool
	}{
		{name: "dex-template-spa/", mode: 0o755, dir: true},
		{name: "dex-template-spa/package.json", body: `{"name":"dex-starter"}`, mode: 0o644},
		{name: "dex-template-spa/bin/", mode: 0o755, dir: true},
		{name: "dex-template-spa/bin/run.sh", body: "#!/bin/sh\necho hi\n", mode: 0o755},
	}

	for _, e := range entries {
		if e.dir {
			if err := tw.WriteHeader(&tar.Header{
				Name:     e.name,
				Mode:     e.mode,
				Typeflag: tar.TypeDir,
			}); err != nil {
				t.Fatal(err)
			}
			continue
		}
		if err := tw.WriteHeader(&tar.Header{
			Name:     e.name,
			Mode:     e.mode,
			Size:     int64(len(e.body)),
			Typeflag: tar.TypeReg,
		}); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(e.body)); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(tgzPath, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}

	destDir := filepath.Join(tmpDir, "out")
	if err := ExtractTemplate(tgzPath, destDir); err != nil {
		t.Fatalf("ExtractTemplate failed: %v", err)
	}

	pkgBytes, err := os.ReadFile(filepath.Join(destDir, "package.json"))
	if err != nil {
		t.Fatalf("missing package.json: %v", err)
	}
	if string(pkgBytes) != `{"name":"dex-starter"}` {
		t.Fatalf("unexpected package.json content: %q", string(pkgBytes))
	}

	shPath := filepath.Join(destDir, "bin", "run.sh")
	info, err := os.Stat(shPath)
	if err != nil {
		t.Fatalf("missing bin/run.sh: %v", err)
	}
	if info.Mode()&0o100 == 0 {
		t.Fatalf("expected executable bit to be preserved on %s, mode=%v", shPath, info.Mode())
	}
}

func TestCachePathForTemplate(t *testing.T) {
	t.Setenv("DEX_CACHE_DIR", "/tmp/dex-test-cache")
	got := CachePathForTemplate("patrickaigbogun/dex", "v0.2.0", "dex-template-spa.tgz")
	want := filepath.Join("/tmp/dex-test-cache", "templates", "patrickaigbogun__dex", "v0.2.0", "dex-template-spa.tgz")
	if got != want {
		t.Fatalf("CachePathForTemplate = %q, want %q", got, want)
	}

	urlPath := CachePathForTemplateURL("https://example.com/template.tgz")
	if !strings.HasPrefix(urlPath, filepath.Join("/tmp/dex-test-cache", "templates", "url")+string(filepath.Separator)) || !strings.HasSuffix(urlPath, ".tgz") {
		t.Fatalf("unexpected CachePathForTemplateURL: %q", urlPath)
	}
}

func TestLoadDexConfig(t *testing.T) {
	tmpDir := t.TempDir()

	// 1. TypeScript config
	tsPath := filepath.Join(tmpDir, "dex.config.ts")
	tsContent := `export default {
	// port: 9999,
	mode: 'spa',
	renderStrategy: "ssr",
	port: 7990,
	apiSpec: 'https://api.example.com/openapi.json',
	apiUrl: "http://localhost:8080",
	outApiTs: 'core/api/client.ts',
	apiPrefix: '/v1',
}
`
	if err := os.WriteFile(tsPath, []byte(tsContent), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := LoadDexConfig(&ProjectLocation{Root: tmpDir, ConfigPath: tsPath})
	if err != nil {
		t.Fatalf("LoadDexConfig ts failed: %v", err)
	}
	if cfg.Mode != "spa" || cfg.RenderStrategy != "ssr" || cfg.Port != 7990 ||
		cfg.APISpec != "https://api.example.com/openapi.json" || cfg.APIURL != "http://localhost:8080" ||
		cfg.OutAPITs != "core/api/client.ts" || cfg.APIPrefix != "/v1" {
		t.Fatalf("unexpected ts config: %+v", cfg)
	}

	// 2. JSON config
	jsonPath := filepath.Join(tmpDir, "dex.config.json")
	if err := os.WriteFile(jsonPath, []byte(`{"mode":"mpa","port":4000,"apiPrefix":"/api"}`), 0o644); err != nil {
		t.Fatal(err)
	}
	jcfg, err := LoadDexConfig(&ProjectLocation{Root: tmpDir, ConfigPath: jsonPath})
	if err != nil {
		t.Fatalf("LoadDexConfig json failed: %v", err)
	}
	if jcfg.Mode != "mpa" || jcfg.Port != 4000 || jcfg.APIPrefix != "/api" {
		t.Fatalf("unexpected json config: %+v", jcfg)
	}

	// 3. package.json#dex
	pkgDir := filepath.Join(tmpDir, "pkgproj")
	if err := os.MkdirAll(pkgDir, 0o755); err != nil {
		t.Fatal(err)
	}
	pkgPath := filepath.Join(pkgDir, "package.json")
	if err := os.WriteFile(pkgPath, []byte(`{"name":"app","dex":{"mode":"spa","port":3001}}`), 0o644); err != nil {
		t.Fatal(err)
	}
	loc, err := FindProjectRoot(pkgDir)
	if err != nil || loc == nil || loc.ConfigPath != pkgPath {
		t.Fatalf("FindProjectRoot failed: loc=%+v err=%v", loc, err)
	}
	pcfg, err := LoadDexConfig(loc)
	if err != nil {
		t.Fatalf("LoadDexConfig package.json failed: %v", err)
	}
	if pcfg.Mode != "spa" || pcfg.Port != 3001 {
		t.Fatalf("unexpected package.json config: %+v", pcfg)
	}
}

func TestValidateTagAndRepo(t *testing.T) {
	validTags := []string{"v0.2.0", "latest", "v1.0.0-alpha.1", "release_2026.1"}
	for _, tag := range validTags {
		if err := ValidateTag(tag); err != nil {
			t.Errorf("ValidateTag(%q) unexpected error: %v", tag, err)
		}
	}

	invalidTags := []string{
		"",
		"../",
		"../v1.0.0",
		"v1..2",
		".hidden",
		"-leading-dash",
		"a/b",
		"tag with space",
		strings.Repeat("a", 129),
	}
	for _, tag := range invalidTags {
		if err := ValidateTag(tag); err == nil {
			t.Errorf("ValidateTag(%q) expected error, got nil", tag)
		}
	}

	badRepos := []string{"../repo", "owner/..", "./repo", "owner/a..b", "owner/repo name"}
	for _, r := range badRepos {
		args := ParseArgs([]string{"--repo", r})
		if _, err := RepoFromEnvOrFlag(args); err == nil {
			t.Errorf("RepoFromEnvOrFlag(%q) expected error, got nil", r)
		}
	}
}

func writeTestArchive(t *testing.T, path string, entries []tar.Header) {
	t.Helper()
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for i := range entries {
		h := entries[i]
		if err := tw.WriteHeader(&h); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestExtractTemplate_Security(t *testing.T) {
	tmpDir := t.TempDir()

	// 1. Symlink rejected
	symlinkTgz := filepath.Join(tmpDir, "symlink.tgz")
	writeTestArchive(t, symlinkTgz, []tar.Header{
		{Name: "root/evil-link", Typeflag: tar.TypeSymlink, Linkname: "/etc/passwd"},
	})
	if err := ExtractTemplate(symlinkTgz, filepath.Join(tmpDir, "out-sym")); err == nil || !strings.Contains(err.Error(), "symlink") {
		t.Fatalf("expected symlink error, got %v", err)
	}

	// 2. Hardlink rejected
	hardlinkTgz := filepath.Join(tmpDir, "hardlink.tgz")
	writeTestArchive(t, hardlinkTgz, []tar.Header{
		{Name: "root/evil-hard", Typeflag: tar.TypeLink, Linkname: "/etc/passwd"},
	})
	if err := ExtractTemplate(hardlinkTgz, filepath.Join(tmpDir, "out-hard")); err == nil || !strings.Contains(err.Error(), "hardlink") {
		t.Fatalf("expected hardlink error, got %v", err)
	}

	// 3. Leading .. rejected
	traversalTgz := filepath.Join(tmpDir, "traversal.tgz")
	writeTestArchive(t, traversalTgz, []tar.Header{
		{Name: "../evil.txt", Typeflag: tar.TypeReg, Mode: 0o644, Size: 0},
	})
	if err := ExtractTemplate(traversalTgz, filepath.Join(tmpDir, "out-trav")); err == nil {
		t.Fatalf("expected error for leading .. in archive")
	}

	// 4. Leading / rejected
	absTgz := filepath.Join(tmpDir, "abs.tgz")
	writeTestArchive(t, absTgz, []tar.Header{
		{Name: "/etc/passwd", Typeflag: tar.TypeReg, Mode: 0o644, Size: 0},
	})
	if err := ExtractTemplate(absTgz, filepath.Join(tmpDir, "out-abs")); err == nil {
		t.Fatalf("expected error for leading / in archive")
	}

	// 5. Refusing to overwrite existing symlink
	destSymlink := filepath.Join(tmpDir, "out-existing-sym")
	if err := os.MkdirAll(destSymlink, 0o755); err != nil {
		t.Fatal(err)
	}
	targetFile := filepath.Join(tmpDir, "outside.txt")
	if err := os.WriteFile(targetFile, []byte("keep"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(targetFile, filepath.Join(destSymlink, "pkg.json")); err != nil {
		t.Fatal(err)
	}
	normalTgz := filepath.Join(tmpDir, "normal.tgz")
	writeTestArchive(t, normalTgz, []tar.Header{
		{Name: "root/pkg.json", Typeflag: tar.TypeReg, Mode: 0o644, Size: 0},
	})
	if err := ExtractTemplate(normalTgz, destSymlink); err == nil || !strings.Contains(err.Error(), "refusing to overwrite symlink") {
		t.Fatalf("expected refusing to overwrite symlink error, got %v", err)
	}
}

func TestGitHubTokenScoping(t *testing.T) {
	t.Setenv("GITHUB_TOKEN", "super-secret-token")

	var gotAuth string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	resp, err := doRequestWithTimeout(srv.URL, nil)
	if err != nil {
		t.Fatalf("doRequestWithTimeout failed: %v", err)
	}
	resp.Body.Close()

	if gotAuth != "" {
		t.Fatalf("expected Authorization header NOT to be sent to %s, got %q", srv.URL, gotAuth)
	}
}
