package core

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// DexConfig represents the configuration loaded from dex.config.* or package.json#dex.
type DexConfig struct {
	Mode            string            `json:"mode"`
	Port            int               `json:"port"`
	RenderStrategy  string            `json:"renderStrategy"`
	PackageVersions map[string]string `json:"packageVersions"`
	APISpec         string            `json:"apiSpec"`
	APIURL          string            `json:"apiUrl"`
	OutAPITs        string            `json:"outApiTs"`
	APIPrefix       string            `json:"apiPrefix"`
}

// ProjectLocation stores the discovered project root and config file path.
type ProjectLocation struct {
	Root       string
	ConfigPath string
}

// DexMetadata represents .dex/metadata.json tracking the synced template version.
type DexMetadata struct {
	Version    string `json:"version,omitempty"`
	SyncedAt   string `json:"syncedAt,omitempty"`
	ReleaseTag string `json:"releaseTag,omitempty"`
}

// DefaultPackages lists the default framework packages bundled into scaffolded projects.
var DefaultPackages = []string{"core", "router", "server", "dev", "pie", "validation"}

var configCandidates = []string{
	filepath.Join("config", "core", "index.ts"),
	filepath.Join("config", "core", "index.js"),
	filepath.Join("config", "core", "index.mjs"),
	filepath.Join("config", "core", "index.json"),
	"dex.config.ts",
	"dex.config.js",
	"dex.config.mjs",
	"dex.config.json",
	filepath.Join("config", "dex.config.ts"),
	filepath.Join("config", "dex.config.js"),
	filepath.Join("config", "dex.config.mjs"),
	filepath.Join("config", "dex.config.json"),
}

func hasConfigVariant(dir, base string) bool {
	for _, ext := range []string{".ts", ".js", ".mjs", ".json"} {
		p := filepath.Join(dir, base+ext)
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			return true
		}
	}
	return false
}

// ResolveEnabledPackages inspects config/core/ split config files in root and returns
// the enabled framework packages. Always includes "core". If no split config files exist
// (e.g. legacy dex.config.ts), returns DefaultPackages.
func ResolveEnabledPackages(root string) []string {
	coreConfigDir := filepath.Join(root, "config", "core")
	mapping := []struct {
		configName string
		pkgName    string
	}{
		{"router", "router"},
		{"server", "server"},
		{"build", "dev"},
		{"api", "pie"},
		{"validation", "validation"},
	}

	pkgs := []string{"core"}
	foundAnySplit := false
	for _, m := range mapping {
		if hasConfigVariant(coreConfigDir, m.configName) {
			foundAnySplit = true
			pkgs = append(pkgs, m.pkgName)
		}
	}

	if !foundAnySplit {
		out := make([]string, len(DefaultPackages))
		copy(out, DefaultPackages)
		return out
	}
	return pkgs
}

// FindProjectRoot walks up from startDir looking for a Dex config file or package.json with a "dex" field.
func FindProjectRoot(startDir string) (*ProjectLocation, error) {
	dir, err := filepath.Abs(startDir)
	if err != nil {
		return nil, err
	}

	for {
		for _, rel := range configCandidates {
			p := filepath.Join(dir, rel)
			if info, err := os.Stat(p); err == nil && !info.IsDir() {
				return &ProjectLocation{Root: dir, ConfigPath: p}, nil
			}
		}

		pkgPath := filepath.Join(dir, "package.json")
		if info, err := os.Stat(pkgPath); err == nil && !info.IsDir() {
			if data, err := os.ReadFile(pkgPath); err == nil {
				var raw map[string]json.RawMessage
				if json.Unmarshal(data, &raw) == nil {
					if dexRaw, ok := raw["dex"]; ok {
						trimmed := strings.TrimSpace(string(dexRaw))
						if trimmed != "" && trimmed != "null" && trimmed != "false" {
							return &ProjectLocation{Root: dir, ConfigPath: pkgPath}, nil
						}
					}
				}
			}
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return nil, nil
		}
		dir = parent
	}
}

// LoadDexConfig parses Dex configuration from JSON, package.json, or TS/JS config files.
func LoadDexConfig(loc *ProjectLocation) (*DexConfig, error) {
	if loc == nil {
		return nil, errors.New("project location is nil")
	}

	data, err := os.ReadFile(loc.ConfigPath)
	if err != nil {
		return nil, err
	}

	if filepath.Base(loc.ConfigPath) == "package.json" {
		var wrapper struct {
			Dex *DexConfig `json:"dex"`
		}
		if err := json.Unmarshal(data, &wrapper); err != nil {
			return nil, err
		}
		if wrapper.Dex == nil {
			return &DexConfig{}, nil
		}
		return wrapper.Dex, nil
	}

	if strings.HasSuffix(loc.ConfigPath, ".json") {
		var cfg DexConfig
		if err := json.Unmarshal(data, &cfg); err != nil {
			return nil, err
		}
		return &cfg, nil
	}

	return parseJSConfig(string(data)), nil
}

func parseJSConfig(src string) *DexConfig {
	// Drop full-line comments so commented-out properties are ignored without
	// disturbing URLs containing "//" inside string literals.
	lines := strings.Split(src, "\n")
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "/*") || strings.HasPrefix(trimmed, "*") {
			continue
		}
		filtered = append(filtered, line)
	}
	cleaned := strings.Join(filtered, "\n")

	cfg := &DexConfig{
		Mode:           extractJSStringField(cleaned, "mode"),
		RenderStrategy: extractJSStringField(cleaned, "renderStrategy"),
		APISpec:        extractJSStringField(cleaned, "apiSpec"),
		APIURL:         extractJSStringField(cleaned, "apiUrl"),
		OutAPITs:       extractJSStringField(cleaned, "outApiTs"),
		APIPrefix:      extractJSStringField(cleaned, "apiPrefix"),
	}

	if portStr := extractJSNumberField(cleaned, "port"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			cfg.Port = p
		}
	}

	return cfg
}

func extractJSStringField(src, key string) string {
	pattern := fmt.Sprintf(`(?:^|[\s,{])['"]?%s['"]?\s*:\s*(?:'([^']*)'|"([^"]*)"|`+"`"+`([^`+"`"+`]*)`+"`"+`)`, regexp.QuoteMeta(key))
	re := regexp.MustCompile(pattern)
	m := re.FindStringSubmatch(src)
	if len(m) == 0 {
		return ""
	}
	for _, group := range m[1:] {
		if group != "" {
			return group
		}
	}
	return ""
}

func extractJSNumberField(src, key string) string {
	pattern := fmt.Sprintf(`(?:^|[\s,{])['"]?%s['"]?\s*:\s*(\d+)`, regexp.QuoteMeta(key))
	re := regexp.MustCompile(pattern)
	m := re.FindStringSubmatch(src)
	if len(m) < 2 {
		return ""
	}
	return m[1]
}

// WriteDexMetadata writes .dex/metadata.json inside destDir.
func WriteDexMetadata(destDir, templateVersion, templateTag string) error {
	dexDir := filepath.Join(destDir, ".dex")
	if err := os.MkdirAll(dexDir, 0o755); err != nil {
		return err
	}

	meta := DexMetadata{
		Version:    templateVersion,
		ReleaseTag: templateTag,
		SyncedAt:   time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
	}
	encoded, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return err
	}
	encoded = append(encoded, '\n')
	return os.WriteFile(filepath.Join(dexDir, "metadata.json"), encoded, 0o644)
}

// GetTemplateMetadata reads .dex/metadata.json from projectRoot, returning (nil, nil) if absent.
func GetTemplateMetadata(projectRoot string) (*DexMetadata, error) {
	metadataPath := filepath.Join(projectRoot, ".dex", "metadata.json")
	data, err := os.ReadFile(metadataPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}

	var meta DexMetadata
	if err := json.Unmarshal(data, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}
