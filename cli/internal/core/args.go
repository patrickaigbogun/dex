package core

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"
)

// ParsedArgs holds parsed positional arguments, key-value flags, and boolean flags.
type ParsedArgs struct {
	Positional []string
	Flags      map[string]string
	BoolFlags  map[string]bool
}

var knownBoolFlags = map[string]bool{
	"--no-install":  true,
	"--no-cache":    true,
	"--fresh":       true,
	"--all":         true,
	"--force":       true,
	"--interactive": true,
	"-v":            true,
	"--version":     true,
	"-f":            true,
	"-p":            true,
	"-h":            true,
	"--help":        true,
}

func stripLeadingHyphens(flag string) string {
	if strings.HasPrefix(flag, "--") {
		return flag[2:]
	}
	return strings.TrimPrefix(flag, "-")
}

// ParseArgs parses command-line arguments into positional args, string flags, and boolean flags.
func ParseArgs(argv []string) ParsedArgs {
	parsed := ParsedArgs{
		Positional: []string{},
		Flags:      make(map[string]string),
		BoolFlags:  make(map[string]bool),
	}

	for i := 0; i < len(argv); i++ {
		a := argv[i]
		if !strings.HasPrefix(a, "-") {
			parsed.Positional = append(parsed.Positional, a)
			continue
		}

		key := stripLeadingHyphens(a)
		if knownBoolFlags[a] {
			parsed.BoolFlags[key] = true
			continue
		}

		if i+1 >= len(argv) || strings.HasPrefix(argv[i+1], "-") {
			parsed.BoolFlags[key] = true
			continue
		}

		next := argv[i+1]
		parsed.Flags[key] = next
		if next == "true" {
			parsed.BoolFlags[key] = true
		}
		i++
	}

	return parsed
}

// HasFlag returns true if any of the given flag names is set as a boolean flag or non-empty string flag.
func (p ParsedArgs) HasFlag(names ...string) bool {
	for _, n := range names {
		if p.BoolFlags[n] || p.Flags[n] != "" {
			return true
		}
	}
	return false
}

// GetFlag returns the first non-empty string flag value among the given names.
func (p ParsedArgs) GetFlag(names ...string) string {
	for _, n := range names {
		if val, ok := p.Flags[n]; ok && val != "" {
			return val
		}
	}
	return ""
}

// Step runs fn with formatted progress output and returns its result and error.
func Step[T any](name string, fn func() (T, error)) (T, error) {
	start := time.Now()
	fmt.Printf("\n▶ %s\n", name)
	out, err := fn()
	elapsed := time.Since(start).Milliseconds()
	if err != nil {
		fmt.Fprintf(os.Stderr, "✖ %s (%dms)\n", name, elapsed)
		return out, err
	}
	fmt.Printf("✔ %s (%dms)\n", name, elapsed)
	return out, nil
}

// StepRun runs an error-only step function with formatted progress output.
func StepRun(name string, fn func() error) error {
	_, err := Step(name, func() (struct{}, error) {
		return struct{}{}, fn()
	})
	return err
}

func readLine(r *bufio.Reader) (string, error) {
	line, err := r.ReadString('\n')
	trimmed := strings.TrimSpace(line)
	if err != nil && (!errors.Is(err, io.EOF) || trimmed == "") {
		return trimmed, err
	}
	return trimmed, nil
}

// PromptSelect prompts the user to choose one option by number from os.Stdin.
func PromptSelect(question string, options []string) (string, error) {
	if len(options) == 0 {
		return "", errors.New("no options provided")
	}

	fmt.Printf("%s\n", question)
	for i, opt := range options {
		fmt.Printf("  %d) %s\n", i+1, opt)
	}
	fmt.Print("> ")

	reader := bufio.NewReader(os.Stdin)
	answer, err := readLine(reader)
	if err != nil {
		return "", err
	}

	n, err := strconv.Atoi(answer)
	if err != nil || n < 1 || n > len(options) {
		return "", errors.New("Invalid selection")
	}
	return options[n-1], nil
}

// PromptMultiSelect prompts the user to toggle multiple options by number until "done".
func PromptMultiSelect(question string, options []string) ([]string, error) {
	fmt.Printf("%s\n", question)
	selected := make(map[int]bool)
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("\nOptions:\n")
		for i, opt := range options {
			checked := "[ ]"
			if selected[i] {
				checked = "[x]"
			}
			fmt.Printf("  %s %d) %s\n", checked, i+1, opt)
		}
		fmt.Print("\nEnter number to toggle, or \"done\" to finish: > ")

		answer, err := readLine(reader)
		if err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			return nil, err
		}

		if strings.ToLower(answer) == "done" {
			break
		}

		n, err := strconv.Atoi(answer)
		if err == nil && n >= 1 && n <= len(options) {
			idx := n - 1
			selected[idx] = !selected[idx]
		}
	}

	var result []string
	for i, opt := range options {
		if selected[i] {
			result = append(result, opt)
		}
	}
	return result, nil
}

// PromptConfirm prompts the user with a yes/no confirmation question.
func PromptConfirm(question string) (bool, error) {
	fmt.Printf("%s (y/n) > ", question)
	reader := bufio.NewReader(os.Stdin)
	answer, err := readLine(reader)
	if err != nil {
		return false, err
	}
	lower := strings.ToLower(answer)
	return lower == "y" || lower == "yes", nil
}
