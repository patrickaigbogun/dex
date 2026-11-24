//go:build windows

package runner

import "os/exec"

func setProcessGroup(cmd *exec.Cmd) {
}

func terminateProcessGroup(cmd *exec.Cmd, force bool) {
	if cmd == nil || cmd.Process == nil {
		return
	}
	_ = cmd.Process.Kill()
}
