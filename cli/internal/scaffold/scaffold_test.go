package scaffold

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/patrickaigbogun/dex/cli/internal/core"
)

func createTestTgz(t *testing.T, rootDir string, files map[string]string) []byte {
	t.Helper()
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)

	for rel, content := range files {
		name := rootDir + "/" + rel
		if err := tw.WriteHeader(&tar.Header{
			Name:     name,
			Mode:     0o644,
			Size:     int64(len(content)),
			Typeflag: tar.TypeReg,
		}); err != nil {
			t.Fatal(err)
		}
		if _, err := tw.Write([]byte(content)); err != nil {
			t.Fatal(err)
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	if err := gz.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestCmdScaffoldLocalTemplateAndCache(t *testing.T) {
	tmpDir := t.TempDir()
	cacheDir := filepath.Join(tmpDir, "cache")
	t.Setenv("DEX_CACHE_DIR", cacheDir)

	// Prepare local template tgz
	tmplPath := filepath.Join(tmpDir, "dex-template-spa.tgz")
	tmplBytes := createTestTgz(t, "dex-template-spa", map[string]string{
		"package.json":  `{"name":"dex-starter","dex":{"mode":"spa"}}`,
		"dex.config.ts": "export default { mode: 'spa', port: 7990 }\n",
	})
	if err := os.WriteFile(tmplPath, tmplBytes, 0o644); err != nil {
		t.Fatal(err)
	}

	// Pre-populate cached packages so no network access is needed
	pkgRepo := "testowner/dex"
	pkgTag := "v0.1.0"
	for _, pkg := range core.DefaultPackages {
		asset := "dex-package-" + pkg + ".tgz"
		dest := core.CachePathForTemplate(pkgRepo, pkgTag, asset)
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			t.Fatal(err)
		}
		tgz := createTestTgz(t, "pkg-"+pkg, map[string]string{
			"package.json": `{"name":"@dex/` + pkg + `","version":"0.1.0"}`,
			"src/index.ts": "export const pkg = '" + pkg + "'\n",
		})
		if err := os.WriteFile(dest, tgz, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	projectDir := filepath.Join(tmpDir, "my-app")
	args := core.ParseArgs([]string{
		"scaffold",
		projectDir,
		"--mode", "spa",
		"--template", tmplPath,
		"--packages-repo", pkgRepo,
		"--packages-tag", pkgTag,
		"--no-install",
	})

	if err := CmdScaffold(projectDir, args); err != nil {
		t.Fatalf("CmdScaffold failed: %v", err)
	}

	// Verify package.json updated
	pkgRaw, err := os.ReadFile(filepath.Join(projectDir, "package.json"))
	if err != nil {
		t.Fatal(err)
	}
	var pkgData map[string]any
	if err := json.Unmarshal(pkgRaw, &pkgData); err != nil {
		t.Fatal(err)
	}
	if pkgData["name"] != "my-app" {
		t.Fatalf("package.json name = %v, want my-app", pkgData["name"])
	}
	dexField := pkgData["dex"].(map[string]any)
	pkgVersions := dexField["packageVersions"].(map[string]any)
	if pkgVersions["@dex/router"] != "0.1.0" || pkgVersions["@dex/pie"] != "0.1.0" {
		t.Fatalf("unexpected packageVersions: %v", pkgVersions)
	}

	// Verify packages/index.ts and .dex/metadata.json
	idxRaw, err := os.ReadFile(filepath.Join(projectDir, "packages", "index.ts"))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(idxRaw), "export * from './router/src/index'") {
		t.Fatalf("unexpected packages/index.ts: %s", string(idxRaw))
	}

	meta, err := core.GetTemplateMetadata(projectDir)
	if err != nil || meta == nil || meta.Version != "unknown" {
		t.Fatalf("unexpected metadata: %+v err=%v", meta, err)
	}

	// Test CmdTemplate list / cache list / cache clean
	if err := CmdTemplate([]string{"template", "list"}, core.ParseArgs(nil)); err != nil {
		t.Fatalf("CmdTemplate list failed: %v", err)
	}
	if err := CmdTemplate([]string{"template", "cache", "list"}, core.ParseArgs(nil)); err != nil {
		t.Fatalf("CmdTemplate cache list failed: %v", err)
	}
	if err := CmdTemplate([]string{"template", "cache", "clean", pkgTag}, core.ParseArgs(nil)); err != nil {
		t.Fatalf("CmdTemplate cache clean tag failed: %v", err)
	}
	if _, err := os.Stat(filepath.Join(cacheDir, "templates", "testowner__dex", pkgTag)); !os.IsNotExist(err) {
		t.Fatalf("expected tag cache dir to be removed")
	}
}

func TestCmdScaffoldFromURL(t *testing.T) {
	tmpDir := t.TempDir()
	cacheDir := filepath.Join(tmpDir, "cache")
	t.Setenv("DEX_CACHE_DIR", cacheDir)

	tmplBytes := createTestTgz(t, "dex-template-mpa", map[string]string{
		"package.json":  `{"name":"dex-starter"}`,
		"dex.config.ts": "export default { mode: 'mpa', port: 3000 }\n",
	})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(tmplBytes)
	}))
	defer srv.Close()

	pkgRepo := "testowner/dex"
	pkgTag := "v0.2.0"
	for _, pkg := range core.DefaultPackages {
		asset := "dex-package-" + pkg + ".tgz"
		dest := core.CachePathForTemplate(pkgRepo, pkgTag, asset)
		if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
			t.Fatal(err)
		}
		tgz := createTestTgz(t, "pkg-"+pkg, map[string]string{
			"package.json": `{"name":"@dex/` + pkg + `","version":"0.2.0"}`,
		})
		if err := os.WriteFile(dest, tgz, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	projectDir := filepath.Join(tmpDir, "mpa-app")
	args := core.ParseArgs([]string{
		"scaffold",
		projectDir,
		"--mode", "mpa",
		"--template-url", srv.URL + "/dex-template-mpa.tgz",
		"--packages-repo", pkgRepo,
		"--packages-tag", pkgTag,
		"--no-install",
	})

	if err := CmdScaffold(projectDir, args); err != nil {
		t.Fatalf("CmdScaffold from URL failed: %v", err)
	}
}

func TestCmdSyncHelp(t *testing.T) {
	if err := CmdSync(core.ParseArgs([]string{"sync", "--help"})); err != nil {
		t.Fatalf("CmdSync --help failed: %v", err)
	}
}

func TestCmdSync_ChecksumMismatch(t *testing.T) {
	tmpDir := t.TempDir()
	cacheDir := filepath.Join(tmpDir, "cache")
	t.Setenv("DEX_CACHE_DIR", cacheDir)

	projectDir := filepath.Join(tmpDir, "proj")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "dex.config.ts"), []byte("export default { mode: 'spa' }\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := core.WriteDexMetadata(projectDir, "v0.1.0", "v0.1.0"); err != nil {
		t.Fatal(err)
	}

	repo := "testowner/dex"
	targetTag := "v0.2.0"
	cachePath := core.CachePathForTemplate(repo, targetTag, "dex-template-spa.tgz")
	if err := os.MkdirAll(filepath.Dir(cachePath), 0o755); err != nil {
		t.Fatal(err)
	}
	tgz := createTestTgz(t, "dex-template-spa", map[string]string{
		"src/app.ts": "console.log('tampered')\n",
	})
	if err := os.WriteFile(cachePath, tgz, 0o644); err != nil {
		t.Fatal(err)
	}

	origFetch := fetchTemplateDiff
	t.Cleanup(func() { fetchTemplateDiff = origFetch })
	fetchTemplateDiff = func(r, tag string) (*core.TemplateDiff, error) {
		return &core.TemplateDiff{
			Version:      tag,
			ChangedFiles: []string{"src/app.ts"},
			Checksums: map[string]string{
				"src/app.ts": "0000000000000000000000000000000000000000000000000000000000000000",
			},
		}, nil
	}

	origWD, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(projectDir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(origWD) })

	err = CmdSync(core.ParseArgs([]string{"sync", "--repo", repo, "--tag", targetTag}))
	if err == nil || !strings.Contains(err.Error(), "checksum verification failed") {
		t.Fatalf("expected checksum verification failure error, got %v", err)
	}

	if _, statErr := os.Stat(filepath.Join(projectDir, "src", "app.ts")); !os.IsNotExist(statErr) {
		t.Fatalf("expected tampered file NOT to be written to destination")
	}
}

func TestCmdTemplateCacheClean_RejectsInvalidTag(t *testing.T) {
	if err := CmdTemplate([]string{"template", "cache", "clean", "../../etc"}, core.ParseArgs(nil)); err == nil {
		t.Fatalf("expected error for invalid tag in cache clean")
	}
}
