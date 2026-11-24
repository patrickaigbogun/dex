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
