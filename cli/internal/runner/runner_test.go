package runner

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveBunCmd(t *testing.T) {
	t.Run("finds bun in PATH or home", func(t *testing.T) {
		tmpBin := t.TempDir()
		fakeBun := filepath.Join(tmpBin, "bun")
		if err := os.WriteFile(fakeBun, []byte("#!/bin/sh\nexit 0\n"), 0o755); err != nil {
			t.Fatalf("failed to create fake bun: %v", err)
		}

		t.Setenv("PATH", tmpBin)
		cmd, env := ResolveBunCmd()
		if cmd != fakeBun {
			t.Fatalf("expected %q, got %q", fakeBun, cmd)
		}
		if len(env) == 0 {
			t.Fatalf("expected non-empty env")
		}
	})

	t.Run("falls back to $HOME/.bun/bin/bun", func(t *testing.T) {
		tmpHome := t.TempDir()
		bunDir := filepath.Join(tmpHome, ".bun", "bin")
		if err := os.MkdirAll(bunDir, 0o755); err != nil {
			t.Fatalf("failed to mkdir .bun/bin: %v", err)
		}
		fakeBun := filepath.Join(bunDir, "bun")
		if err := os.WriteFile(fakeBun, []byte("#!/bin/sh\nexit 0\n"), 0o755); err != nil {
			t.Fatalf("failed to create fake bun: %v", err)
		}

		t.Setenv("HOME", tmpHome)
		t.Setenv("PATH", "/nonexistent-dir")
		cmd, env := ResolveBunCmd()
		if cmd != fakeBun {
			t.Fatalf("expected %q, got %q", fakeBun, cmd)
		}

		foundPath := false
		for _, e := range env {
			if strings.HasPrefix(e, "PATH=") && strings.Contains(e, bunDir) {
				foundPath = true
				break
			}
		}
		if !foundPath {
			t.Fatalf("expected returned env PATH to include %q", bunDir)
		}
	})
}

func TestSpawnGroup(t *testing.T) {
	t.Run("clean exit for multiple tasks", func(t *testing.T) {
		tmpDir := t.TempDir()
		err := SpawnGroup(tmpDir, []Task{
			{Name: "alpha", Cmd: []string{"sh", "-c", "echo hello-alpha"}},
			{Name: "beta", Cmd: []string{"sh", "-c", "echo hello-beta >&2"}},
		})
		if err != nil {
			t.Fatalf("expected nil error on clean exit, got %v", err)
		}
	})

	t.Run("terminates group when a task exits non-zero", func(t *testing.T) {
		tmpDir := t.TempDir()
		err := SpawnGroup(tmpDir, []Task{
			{Name: "failer", Cmd: []string{"sh", "-c", "echo failing; exit 2"}},
			{Name: "sleeper", Cmd: []string{"sh", "-c", "sleep 30"}},
		})
		if err == nil {
			t.Fatalf("expected non-nil error when a task fails")
		}
		if !strings.Contains(err.Error(), "failer") {
			t.Fatalf("expected error to mention failing task, got %v", err)
		}
	})
}

func TestCmdBuildAndStart_DexCore(t *testing.T) {
	tmpBin := t.TempDir()
	logFile := filepath.Join(tmpBin, "bun-args.log")
	fakeBun := filepath.Join(tmpBin, "bun")
	script := "#!/bin/sh\nprintf '%s\\n' \"$@\" > \"" + logFile + "\"\n"
	if err := os.WriteFile(fakeBun, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", tmpBin)

	projectDir := t.TempDir()
	coreSrcDir := filepath.Join(projectDir, "packages", "core", "src")
	if err := os.MkdirAll(coreSrcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(coreSrcDir, "build.ts"), []byte("export async function runBuild() {}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(coreSrcDir, "dev.ts"), []byte("export async function runDev() {}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := CmdBuild(projectDir); err != nil {
		t.Fatalf("CmdBuild failed: %v", err)
	}
	out, err := os.ReadFile(logFile)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(out), "@dex/core/build") || !strings.Contains(string(out), "runBuild()") {
		t.Fatalf("expected @dex/core/build invocation, got %q", string(out))
	}

	if err := CmdStart(projectDir, false, 7990); err != nil {
		t.Fatalf("CmdStart failed: %v", err)
	}
	out, err = os.ReadFile(logFile)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(out), "@dex/core/dev") || !strings.Contains(string(out), "runDev()") {
		t.Fatalf("expected @dex/core/dev invocation, got %q", string(out))
	}
}
