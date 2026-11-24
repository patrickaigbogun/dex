package version

import (
	"os"
	"os/exec"
	"strings"
	"testing"
)

func TestParseSemverLikeTag(t *testing.T) {
	tests := []struct {
		tag    string
		expectParts SemverParts
		expectStrict bool
		expectOk     bool
	}{
		{"v0.1.45", SemverParts{0, 1, 45}, true, true},
		{"0.2.0", SemverParts{0, 2, 0}, true, true},
		{"v1.2", SemverParts{1, 2, 0}, false, true},
		{"v0.1.44.1", SemverParts{0, 1, 44}, false, true},
		{"v1", SemverParts{}, false, false},
		{"abc", SemverParts{}, false, false},
		{"v1.a.3", SemverParts{}, false, false},
		{"   ", SemverParts{}, false, false},
	}

	for _, tt := range tests {
		parts, strict, ok := ParseSemverLikeTag(tt.tag)
		if ok != tt.expectOk {
			t.Errorf("ParseSemverLikeTag(%q) ok = %v, expected %v", tt.tag, ok, tt.expectOk)
			continue
		}
		if !ok {
			continue
		}
		if strict != tt.expectStrict {
			t.Errorf("ParseSemverLikeTag(%q) strict = %v, expected %v", tt.tag, strict, tt.expectStrict)
		}
		if parts != tt.expectParts {
			t.Errorf("ParseSemverLikeTag(%q) parts = %v, expected %v", tt.tag, parts, tt.expectParts)
		}
	}
}

func TestCompareSemver(t *testing.T) {
	if CompareSemver(SemverParts{0, 1, 2}, SemverParts{0, 1, 3}) >= 0 {
		t.Error("Expected 0.1.2 < 0.1.3")
	}
	if CompareSemver(SemverParts{1, 0, 0}, SemverParts{0, 9, 9}) <= 0 {
		t.Error("Expected 1.0.0 > 0.9.9")
	}
	if CompareSemver(SemverParts{1, 1, 1}, SemverParts{1, 1, 1}) != 0 {
		t.Error("Expected 1.1.1 == 1.1.1")
	}
}

func TestFormatSemverTag(t *testing.T) {
	if s := FormatSemverTag(SemverParts{0, 2, 1}); s != "v0.2.1" {
		t.Errorf("FormatSemverTag returned %q, expected 'v0.2.1'", s)
	}
}

func TestBumpSemver(t *testing.T) {
	curr := SemverParts{0, 1, 44}
	
	patch, err := BumpSemver(curr, "patch")
	if err != nil || patch != (SemverParts{0, 1, 45}) {
		t.Errorf("Bump patch failed: %v, %v", patch, err)
	}

	minor, err := BumpSemver(curr, "minor")
	if err != nil || minor != (SemverParts{0, 2, 0}) {
		t.Errorf("Bump minor failed: %v, %v", minor, err)
	}

	major, err := BumpSemver(curr, "major")
	if err != nil || major != (SemverParts{1, 0, 0}) {
		t.Errorf("Bump major failed: %v, %v", major, err)
	}

	_, err = BumpSemver(curr, "invalid")
	if err == nil {
		t.Error("Expected error on invalid bump kind")
	}
}

func TestCmdTag(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "dex-git-test-*")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(tmpDir)

	runGit := func(args ...string) {
		cmd := exec.Command("git", args...)
		cmd.Dir = tmpDir
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %s failed: %v (%s)", strings.Join(args, " "), err, string(out))
		}
	}

	runGit("init")
	runGit("config", "user.name", "Test User")
	runGit("config", "user.email", "test@example.com")
	runGit("commit", "--allow-empty", "-m", "initial")
	runGit("tag", "v0.1.0")

	err = CmdTag("patch", tmpDir)
	if err != nil {
		t.Fatalf("CmdTag failed: %v", err)
	}

	cmd := exec.Command("git", "tag", "--list")
	cmd.Dir = tmpDir
	out, err := cmd.Output()
	if err != nil {
		t.Fatal(err)
	}
	tags := string(out)
	if !strings.Contains(tags, "v0.1.1") {
		t.Errorf("Expected tag v0.1.1 to be created, got tags:\n%s", tags)
	}
}
