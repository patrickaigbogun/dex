package version

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestGetDexHome(t *testing.T) {
	os.Setenv("DEX_HOME", "/custom/dex/home")
	defer os.Unsetenv("DEX_HOME")

	if h := GetDexHome(); h != "/custom/dex/home" {
		t.Errorf("GetDexHome() = %q, expected '/custom/dex/home'", h)
	}
}

func TestGetHostPlatformAsset(t *testing.T) {
	osName, archName, ext, asset, err := GetHostPlatformAsset()
	if err != nil {
		t.Fatalf("GetHostPlatformAsset failed: %v", err)
	}
	if osName == "" || archName == "" || asset == "" {
		t.Errorf("Invalid asset info: os=%s, arch=%s, ext=%s, asset=%s", osName, archName, ext, asset)
	}
}

func TestCmdVersion(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "dex-version-test-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	// test without template
	// capture stdout or verify no error
	err = CmdVersion("0.1.0", false, tmpDir)
	if err != nil {
		t.Errorf("CmdVersion without template failed: %v", err)
	}

	// test with template
	metaDir := filepath.Join(tmpDir, ".dex")
	if err := os.MkdirAll(metaDir, 0755); err != nil {
		t.Fatal(err)
	}
	metaData, _ := json.Marshal(map[string]string{"templateVersion": "v0.1.0"})
	if err := os.WriteFile(filepath.Join(metaDir, "metadata.json"), metaData, 0644); err != nil {
		t.Fatal(err)
	}

	err = CmdVersion("v0.1.0", true, tmpDir)
	if err != nil {
		t.Errorf("CmdVersion with template failed: %v", err)
	}
}

func TestVersionTagValidation(t *testing.T) {
	if err := CmdUse("../evil"); err == nil {
		t.Fatalf("expected CmdUse to reject traversal tag")
	}
	if err := SetActiveDexVersion(t.TempDir(), "../evil", ""); err == nil {
		t.Fatalf("expected SetActiveDexVersion to reject traversal tag")
	}
	err := CmdUpdate(
		"../evil",
		"patrickaigbogun/dex",
		false,
		"v0.2.0",
		nil,
		func(url, dest string) error { return nil },
	)
	if err == nil {
		t.Fatalf("expected CmdUpdate to reject traversal tag")
	}
}

func TestCmdUpdate_SHA256Verification(t *testing.T) {
	dexHome := t.TempDir()
	t.Setenv("DEX_HOME", dexHome)

	_, _, _, asset, err := GetHostPlatformAsset()
	if err != nil {
		t.Fatalf("GetHostPlatformAsset failed: %v", err)
	}
	payload := []byte("#!/bin/sh\necho dex\n")
	sum := sha256.Sum256(payload)
	validHash := hex.EncodeToString(sum[:])

	t.Run("rejects checksum mismatch", func(t *testing.T) {
		origSums := fetchReleaseSHA256Sums
		t.Cleanup(func() { fetchReleaseSHA256Sums = origSums })
		fetchReleaseSHA256Sums = func(repo, tag string) (map[string]string, error) {
			return map[string]string{asset: strings.Repeat("0", 64)}, nil
		}

		err := CmdUpdate(
			"v0.4.0",
			"testowner/dex",
			true,
			"v0.3.0",
			nil,
			func(url, dest string) error {
				return os.WriteFile(dest, payload, 0o755)
			},
		)
		if err == nil || !strings.Contains(err.Error(), "checksum verification failed") {
			t.Fatalf("expected checksum verification error, got %v", err)
		}
		if _, statErr := os.Stat(filepath.Join(dexHome, "versions", "v0.4.0", "dex")); !os.IsNotExist(statErr) {
			t.Fatalf("expected unverified binary NOT to be installed")
		}
	})

	t.Run("accepts matching checksum", func(t *testing.T) {
		origSums := fetchReleaseSHA256Sums
		t.Cleanup(func() { fetchReleaseSHA256Sums = origSums })
		fetchReleaseSHA256Sums = func(repo, tag string) (map[string]string, error) {
			return map[string]string{asset: validHash}, nil
		}

		err := CmdUpdate(
			"v0.4.1",
			"testowner/dex",
			true,
			"v0.3.0",
			nil,
			func(url, dest string) error {
				return os.WriteFile(dest, payload, 0o755)
			},
		)
		if err != nil {
			t.Fatalf("CmdUpdate failed: %v", err)
		}
	})
}

func TestCmdPrune(t *testing.T) {
	dexHome := t.TempDir()
	t.Setenv("DEX_HOME", dexHome)

	for _, ver := range []string{"v0.1.0", "v0.2.0", "v0.3.0"} {
		vDir := filepath.Join(dexHome, "versions", ver)
		if err := os.MkdirAll(vDir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(vDir, "dex"), []byte(ver), 0o755); err != nil {
			t.Fatal(err)
		}
	}

	if err := SetActiveDexVersion(dexHome, "v0.2.0", ""); err != nil {
		t.Fatalf("SetActiveDexVersion failed: %v", err)
	}

	if err := CmdPrune(); err != nil {
		t.Fatalf("CmdPrune failed: %v", err)
	}

	if _, err := os.Stat(filepath.Join(dexHome, "versions", "v0.2.0")); err != nil {
		t.Fatalf("expected active version v0.2.0 to remain: %v", err)
	}
	for _, removed := range []string{"v0.1.0", "v0.3.0"} {
		if _, err := os.Stat(filepath.Join(dexHome, "versions", removed)); !os.IsNotExist(err) {
			t.Fatalf("expected inactive version %s to be removed", removed)
		}
	}
}
