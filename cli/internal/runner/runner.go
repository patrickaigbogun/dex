package runner

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

// Task describes a named command managed by SpawnGroup.
type Task struct {
	Name string
	Cmd  []string
}

// ResolveBunCmd finds the bun executable via PATH or $HOME/.bun/bin/bun and returns an environment slice.
func ResolveBunCmd() (cmd string, env []string) {
	env = os.Environ()
	if p, err := exec.LookPath("bun"); err == nil {
		return p, env
	}

	if home, err := os.UserHomeDir(); err == nil && home != "" {
		bunBinDir := filepath.Join(home, ".bun", "bin")
		candidate := filepath.Join(bunBinDir, "bun")
		if info, statErr := os.Stat(candidate); statErr == nil && !info.IsDir() {
			return candidate, prependPathEnv(env, bunBinDir)
		}
	}

	return "bun", env
}

func resolveExecutable(name string) (string, []string) {
	if name == "bun" {
		return ResolveBunCmd()
	}
	_, env := ResolveBunCmd()
	if p, err := exec.LookPath(name); err == nil {
		return p, env
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		candidate := filepath.Join(home, ".bun", "bin", name)
		if info, statErr := os.Stat(candidate); statErr == nil && !info.IsDir() {
			return candidate, prependPathEnv(env, filepath.Join(home, ".bun", "bin"))
		}
	}
	return name, env
}

func prependPathEnv(env []string, dir string) []string {
	out := make([]string, 0, len(env)+1)
	pathUpdated := false
	for _, entry := range env {
		if strings.HasPrefix(entry, "PATH=") {
			cur := strings.TrimPrefix(entry, "PATH=")
			if cur == "" {
				out = append(out, "PATH="+dir)
			} else if !containsPathDir(cur, dir) {
				out = append(out, "PATH="+dir+string(os.PathListSeparator)+cur)
			} else {
				out = append(out, entry)
			}
			pathUpdated = true
			continue
		}
		out = append(out, entry)
	}
	if !pathUpdated {
		out = append(out, "PATH="+dir)
	}
	return out
}

func containsPathDir(pathEnv, dir string) bool {
	for _, p := range filepath.SplitList(pathEnv) {
		if p == dir {
			return true
		}
	}
	return false
}

func mergeEnv(base []string, extra map[string]string) []string {
	if len(extra) == 0 {
		return base
	}
	result := make([]string, 0, len(base)+len(extra))
	seen := make(map[string]bool, len(extra))
	for _, entry := range base {
		if k, _, ok := strings.Cut(entry, "="); ok {
			if val, override := extra[k]; override {
				result = append(result, k+"="+val)
				seen[k] = true
				continue
			}
		}
		result = append(result, entry)
	}
	for k, v := range extra {
		if !seen[k] {
			result = append(result, k+"="+v)
		}
	}
	return result
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

// RunCommand executes an external command attached to stdio and forwards SIGINT/SIGTERM to the child process.
func RunCommand(cmd string, args []string, cwd string, extraEnv map[string]string) error {
	resolvedCmd, baseEnv := resolveExecutable(cmd)
	c := exec.Command(resolvedCmd, args...)
	if cwd != "" {
		c.Dir = cwd
	}
	c.Env = mergeEnv(baseEnv, extraEnv)
	c.Stdin = os.Stdin
	c.Stdout = os.Stdout
	c.Stderr = os.Stderr

	if err := c.Start(); err != nil {
		return err
	}

	sigCh := make(chan os.Signal, 2)
	doneCh := make(chan struct{})
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	defer func() {
		signal.Stop(sigCh)
		close(doneCh)
	}()

	go func() {
		for {
			select {
			case sig := <-sigCh:
				if c.Process != nil {
					_ = c.Process.Signal(sig)
				}
			case <-doneCh:
				return
			}
		}
	}()

	return c.Wait()
}

// CmdBuild runs the project build via core/bootstrap/build.ts, @dex/core/build, core/bootstrap/scripts.ts, or `bun run build`.
func CmdBuild(projectRoot string) error {
	buildTS := filepath.Join(projectRoot, "core", "bootstrap", "build.ts")
	if fileExists(buildTS) {
		return RunCommand("bun", []string{"core/bootstrap/build.ts"}, projectRoot, nil)
	}

	coreBuildTS := filepath.Join(projectRoot, "packages", "core", "src", "build.ts")
	if fileExists(coreBuildTS) {
		return RunCommand("bun", []string{"-e", "import { runBuild } from '@dex/core/build'; await runBuild()"}, projectRoot, nil)
	}

	scriptsTS := filepath.Join(projectRoot, "core", "bootstrap", "scripts.ts")
	if fileExists(scriptsTS) {
		return RunCommand("bun", []string{"-e", "import * as m from './core/bootstrap/scripts.ts'; if (typeof m.runBuild === 'function') await m.runBuild();"}, projectRoot, nil)
	}

	return RunCommand("bun", []string{"run", "build"}, projectRoot, nil)
}

// CmdStart starts the app in production or development mode.
func CmdStart(projectRoot string, prod bool, configuredPort int) error {
	extraEnv := make(map[string]string)
	if prod {
		extraEnv["NODE_ENV"] = "production"
	}
	if os.Getenv("PORT") == "" && configuredPort > 0 {
		extraEnv["PORT"] = strconv.Itoa(configuredPort)
	}

	if prod {
		if runtime.GOOS == "windows" {
			serverExe := filepath.Join(projectRoot, "build", "server.exe")
			if fileExists(serverExe) {
				return RunCommand(serverExe, nil, projectRoot, extraEnv)
			}
		}
		serverBin := filepath.Join(projectRoot, "build", "server")
		if fileExists(serverBin) {
			return RunCommand("./build/server", nil, projectRoot, extraEnv)
		}
		return RunCommand("bun", []string{"run", "start"}, projectRoot, extraEnv)
	}

	devTS := filepath.Join(projectRoot, "core", "bootstrap", "dev.ts")
	if fileExists(devTS) {
		return RunCommand("bun", []string{"core/bootstrap/dev.ts"}, projectRoot, extraEnv)
	}

	coreDevTS := filepath.Join(projectRoot, "packages", "core", "src", "dev.ts")
	if fileExists(coreDevTS) {
		return RunCommand("bun", []string{"-e", "import { runDev } from '@dex/core/dev'; await runDev()"}, projectRoot, extraEnv)
	}

	scriptsTS := filepath.Join(projectRoot, "core", "bootstrap", "scripts.ts")
	if fileExists(scriptsTS) {
		return RunCommand("bun", []string{"-e", "import * as m from './core/bootstrap/scripts.ts'; if (typeof m.runDev === 'function') await m.runDev();"}, projectRoot, extraEnv)
	}

	return RunCommand("bun", []string{"run", "dev"}, projectRoot, extraEnv)
}

// SpawnGroup runs all tasks concurrently with prefixed output, terminating the group on non-zero exit or signal.
func SpawnGroup(cwd string, tasks []Task) error {
	if len(tasks) == 0 {
		return nil
	}

	raw := os.Getenv("DEX_DEV_RAW") == "1" || os.Getenv("DEX_DEV_RAW") == "true"
	useColor := isTerminal(os.Stdout) && os.Getenv("NO_COLOR") == ""

	tagColors := []string{"\x1b[36m", "\x1b[35m", "\x1b[34m", "\x1b[32m", "\x1b[33m"}
	const (
		reset = "\x1b[0m"
		dim   = "\x1b[2m"
	)

	formatTag := func(name string, colorIndex int) string {
		if !useColor {
			return "[" + name + "]"
		}
		c := tagColors[colorIndex%len(tagColors)]
		return dim + "[" + c + name + reset + dim + "]" + reset
	}

	type runningProc struct {
		name   string
		cmd    *exec.Cmd
		exited bool
	}
	type taskResult struct {
		name string
		err  error
	}

	var mu sync.Mutex
	var procs []*runningProc
	var killTimer *time.Timer
	doneCh := make(chan taskResult, len(tasks))

	defer func() {
		mu.Lock()
		if killTimer != nil {
			killTimer.Stop()
		}
		mu.Unlock()
	}()

	terminateAll := func() {
		mu.Lock()
		for _, rp := range procs {
			if !rp.exited {
				terminateProcessGroup(rp.cmd, false)
			}
		}
		if killTimer == nil {
			killTimer = time.AfterFunc(2*time.Second, func() {
				mu.Lock()
				defer mu.Unlock()
				for _, rp := range procs {
					if !rp.exited {
						terminateProcessGroup(rp.cmd, true)
					}
				}
			})
		}
		mu.Unlock()
	}

	var outMu sync.Mutex
	writeLine := func(w io.Writer, tag, line string) {
		outMu.Lock()
		defer outMu.Unlock()
		_, _ = fmt.Fprintf(w, "%s %s\n", tag, line)
	}

	pumpLines := func(r io.Reader, w io.Writer, tag string, wg *sync.WaitGroup) {
		defer wg.Done()
		reader := bufio.NewReader(r)
		for {
			line, err := reader.ReadString('\n')
			if len(line) > 0 {
				line = strings.TrimRight(line, "\r\n")
				writeLine(w, tag, line)
			}
			if err != nil {
				break
			}
		}
	}

	started := 0
	for i, task := range tasks {
		if len(task.Cmd) == 0 {
			terminateAll()
			return fmt.Errorf("task %q has an empty command", task.Name)
		}

		resolvedCmd, baseEnv := resolveExecutable(task.Cmd[0])
		c := exec.Command(resolvedCmd, task.Cmd[1:]...)
		if cwd != "" {
			c.Dir = cwd
		}
		c.Env = baseEnv
		setProcessGroup(c)

		var wg sync.WaitGroup
		if raw {
			c.Stdout = os.Stdout
			c.Stderr = os.Stderr
		} else {
			stdoutPipe, err := c.StdoutPipe()
			if err != nil {
				terminateAll()
				return fmt.Errorf("task %q stdout pipe: %w", task.Name, err)
			}
			stderrPipe, err := c.StderrPipe()
			if err != nil {
				terminateAll()
				return fmt.Errorf("task %q stderr pipe: %w", task.Name, err)
			}
			tag := formatTag(task.Name, i+1)
			wg.Add(2)
			go pumpLines(stdoutPipe, os.Stdout, tag, &wg)
			go pumpLines(stderrPipe, os.Stderr, tag, &wg)
		}

		if err := c.Start(); err != nil {
			terminateAll()
			return fmt.Errorf("failed to start task %q: %w", task.Name, err)
		}

		rp := &runningProc{name: task.Name, cmd: c}
		mu.Lock()
		procs = append(procs, rp)
		mu.Unlock()
		started++

		go func(proc *runningProc, pipeWG *sync.WaitGroup) {
			pipeWG.Wait()
			err := proc.cmd.Wait()
			mu.Lock()
			proc.exited = true
			mu.Unlock()
			doneCh <- taskResult{name: proc.name, err: err}
		}(rp, &wg)
	}

	sigCh := make(chan os.Signal, 2)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(sigCh)

	remaining := started
	var firstErr error
	shuttingDown := false

	for remaining > 0 {
		select {
		case <-sigCh:
			if !shuttingDown {
				shuttingDown = true
				terminateAll()
			}
		case res := <-doneCh:
			remaining--
			if res.err != nil && !shuttingDown {
				shuttingDown = true
				firstErr = fmt.Errorf("task %q exited with error: %w", res.name, res.err)
				var exitErr *exec.ExitError
				if errors.As(res.err, &exitErr) {
					_, _ = fmt.Fprintf(os.Stderr, "[dex-dev] %s exited with code %d\n", res.name, exitErr.ExitCode())
				} else {
					_, _ = fmt.Fprintf(os.Stderr, "[dex-dev] %s failed: %v\n", res.name, res.err)
				}
				terminateAll()
			}
		}
	}

	return firstErr
}

func isTerminal(f *os.File) bool {
	info, err := f.Stat()
	if err != nil {
		return false
	}
	return (info.Mode() & os.ModeCharDevice) != 0
}
