package main

import (
	"testing"
)

func TestRunHelpAndVersion(t *testing.T) {
	if err := run([]string{"--version"}); err != nil {
		t.Fatalf("expected --version to succeed, got %v", err)
	}
	if err := run([]string{"--help"}); err != nil {
		t.Fatalf("expected --help to succeed, got %v", err)
	}
	if err := run([]string{"pie", "--help"}); err != nil {
		t.Fatalf("expected pie --help to succeed, got %v", err)
	}
	if err := run([]string{"api", "-h"}); err != nil {
		t.Fatalf("expected api -h to succeed, got %v", err)
	}
	if err := run([]string{"unknown-cmd"}); err == nil {
		t.Fatalf("expected unknown command to return error")
	}
}
