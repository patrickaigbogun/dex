package scaffold

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/patrickaigbogun/dex/cli/internal/core"
)

var (
	semverStartRe     = regexp.MustCompile(`^\d+\.\d+\.\d+`)
	fetchTemplateDiff = core.FetchTemplateDiff
)

func templatePathFromEnvOrFlag(args core.ParsedArgs) (string, error) {
	p := args.GetFlag("template")
	if p == "" {
		p = os.Getenv("DEX_TEMPLATE_TGZ")
	}
	if p == "" {
		return "", nil
	}
	return filepath.Abs(p)
}

func templateURLFromEnvOrFlag(args core.ParsedArgs) string {
	if u := args.GetFlag("template-url", "templateUrl"); u != "" {
		return u
	}
	return os.Getenv("DEX_TEMPLATE_URL")
}

func setPackageName(destDir string) error {
	pkgPath := filepath.Join(destDir, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return nil
	}

	var pkg map[string]any
	if err := json.Unmarshal(data, &pkg); err != nil || pkg == nil {
		return nil
	}

	name, _ := pkg["name"].(string)
	if name == "" || name == "dex-starter" {
		pkg["name"] = filepath.Base(destDir)
	}

	encoded, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		return nil
	}
	encoded = append(encoded, '\n')
	_ = os.WriteFile(pkgPath, encoded, 0o644)
	return nil
}

func updateDexPackageVersions(destDir string, versions map[string]string) {
	pkgPath := filepath.Join(destDir, "package.json")
	data, err := os.ReadFile(pkgPath)
	if err != nil {
		return
	}

	var pkg map[string]any
	if err := json.Unmarshal(data, &pkg); err != nil || pkg == nil {
		return
	}

	dexMap, ok := pkg["dex"].(map[string]any)
	if !ok || dexMap == nil {
		dexMap = make(map[string]any)
	}

	pkgVersions, ok := dexMap["packageVersions"].(map[string]any)
	if !ok || pkgVersions == nil {
		pkgVersions = make(map[string]any)
	}
	for k, v := range versions {
		pkgVersions[k] = v
	}
	dexMap["packageVersions"] = pkgVersions
	pkg["dex"] = dexMap

	encoded, err := json.MarshalIndent(pkg, "", "  ")
	if err != nil {
		return
	}
	encoded = append(encoded, '\n')
	_ = os.WriteFile(pkgPath, encoded, 0o644)
}

func writePackagesIndex(destDir string, packageDirs []string) error {
	packagesDir := filepath.Join(destDir, "packages")
	if err := os.MkdirAll(packagesDir, 0o755); err != nil {
		return err
	}
	lines := make([]string, 0, len(packageDirs))
	for _, p := range packageDirs {
		lines = append(lines, fmt.Sprintf("export * from './%s/src/index'", p))
	}
	content := strings.Join(lines, "\n") + "\n"
	return os.WriteFile(filepath.Join(packagesDir, "index.ts"), []byte(content), 0o644)
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func findAnyExisting(baseDir string, rels []string) string {
	for _, rel := range rels {
		p := filepath.Join(baseDir, rel)
		if fileExists(p) {
			return p
		}
	}
	return ""
}

func runScaffoldChecks(destDir string, packageDirs []string) []string {
	var warnings []string

	if !fileExists(filepath.Join(destDir, "package.json")) {
		warnings = append(warnings, "Missing package.json in project root.")
	}

	dexConfig := findAnyExisting(destDir, []string{
		"dex.config.ts",
		"dex.config.js",
		"dex.config.mjs",
		"dex.config.json",
		filepath.Join("config", "dex.config.ts"),
		filepath.Join("config", "dex.config.js"),
		filepath.Join("config", "dex.config.mjs"),
		filepath.Join("config", "dex.config.json"),
	})
	if dexConfig == "" {
		warnings = append(warnings, "Missing dex.config.* (or config/dex.config.*).")
	}

	if !fileExists(filepath.Join(destDir, "packages")) {
		warnings = append(warnings, "Missing packages/ directory.")
	}

	for _, pkg := range packageDirs {
		p := filepath.Join(destDir, "packages", pkg, "package.json")
		if !fileExists(p) {
			warnings = append(warnings, fmt.Sprintf("Missing packages/%s/package.json.", pkg))
		}
	}

	return warnings
}

type resolvedTemplate struct {
	path   string
	source string
	repo   string
	tag    string
}

// CmdScaffold scaffolds a new Dex project into dirArg.
func CmdScaffold(dirArg string, args core.ParsedArgs) error {
	if strings.TrimSpace(dirArg) == "" {
		return errors.New("usage: dex scaffold <dir>")
	}

	destDir, err := core.Step("Prepare destination directory", func() (string, error) {
		resolved, err := filepath.Abs(dirArg)
		if err != nil {
			return "", err
		}
		if err := os.MkdirAll(resolved, 0o755); err != nil {
			return "", err
		}
		entries, err := os.ReadDir(resolved)
		if err != nil {
			return "", err
		}
		if len(entries) > 0 {
			return "", fmt.Errorf("destination is not empty: %s", resolved)
		}
		return resolved, nil
	})
	if err != nil {
		return err
	}

	mode, err := core.Step("Choose project type", func() (string, error) {
		if m := args.GetFlag("mode"); m != "" {
			if m != "spa" && m != "mpa" {
				return "", fmt.Errorf("invalid mode %q: expected spa or mpa", m)
			}
			return m, nil
		}
		return core.PromptSelect("Choose project type", []string{"spa", "mpa"})
	})
	if err != nil {
		return err
	}

	assetName := "dex-template-mpa.tgz"
	if mode == "spa" {
		assetName = "dex-template-spa.tgz"
	}

	localTemplate, err := templatePathFromEnvOrFlag(args)
	if err != nil {
		return err
	}
	templateURL := templateURLFromEnvOrFlag(args)
	noCache := args.HasFlag("no-cache", "fresh")

	tmpl, err := core.Step(fmt.Sprintf("Resolve template (%s)", assetName), func() (resolvedTemplate, error) {
		if localTemplate != "" {
			if !fileExists(localTemplate) {
				return resolvedTemplate{}, fmt.Errorf("template not found: %s", localTemplate)
			}
			fmt.Printf("   template source: local (%s)\n", localTemplate)
			return resolvedTemplate{path: localTemplate, source: "local"}, nil
		}

		if templateURL != "" {
			p, cache, err := core.GetTemplateTgzPathFromURL(templateURL, noCache)
			if err != nil {
				return resolvedTemplate{}, err
			}
			fmt.Printf("   template source: url (%s)\n", templateURL)
			fmt.Printf("   template cache: %s\n", cache)
			return resolvedTemplate{path: p, source: "url"}, nil
		}

		repo, err := core.RepoFromEnvOrFlag(args)
		if err != nil {
			return resolvedTemplate{}, err
		}
		tag := args.GetFlag("tag")
		if tag == "" {
			tag = "latest"
		}
		if tag == "latest" {
			if resolvedTag, err := core.GetLatestReleaseTag(repo); err == nil && resolvedTag != "" {
				tag = resolvedTag
			}
		}

		p, cache, err := core.GetTemplateTgzPath(repo, tag, assetName, noCache)
		if err != nil {
			msg := err.Error()
			if strings.Contains(msg, "Request timed out") {
				return resolvedTemplate{}, fmt.Errorf(
					"%s\n\nGitHub release asset downloads are timing out. This is often caused by a network policy blocking github.com downloads.\n"+
						"Workarounds:\n"+
						"- Provide a local template: --template /path/to/%s  (or set DEX_TEMPLATE_TGZ)\n"+
						"- Provide a direct URL: --template-url https://.../%s (or set DEX_TEMPLATE_URL)\n"+
						"- Increase timeout: set DEX_FETCH_TIMEOUT_MS=60000\n"+
						"- If you hit rate limits, set GITHUB_TOKEN",
					msg, assetName, assetName,
				)
			}
			return resolvedTemplate{}, err
		}

		fmt.Printf("   template source: github (%s@%s)\n", repo, tag)
		fmt.Printf("   template cache: %s\n", cache)
		return resolvedTemplate{path: p, source: "github", repo: repo, tag: tag}, nil
	})
	if err != nil {
		return err
	}

	if err := core.StepRun("Extract template", func() error {
		return core.ExtractTemplate(tmpl.path, destDir)
	}); err != nil {
		return err
	}

	if err := core.StepRun("Finalize project files", func() error {
		return setPackageName(destDir)
	}); err != nil {
		return err
	}

	if err := core.StepRun("Fetch framework packages", func() error {
		pkgRepo, err := core.PackageRepoFromEnvOrFlag(args)
		if err != nil {
			return err
		}
		if pkgRepo == "" && tmpl.source == "github" {
			pkgRepo = tmpl.repo
		}
		if pkgRepo == "" {
			return errors.New("missing package repo. Set DEX_PACKAGE_REPO (or pass --packages-repo) to fetch dex-package-*.tgz assets")
		}

		pkgTag := core.PackageTagFromEnvOrFlag(args)
		if pkgTag == "" {
			if tmpl.source == "github" && tmpl.tag != "" {
				pkgTag = tmpl.tag
			} else {
				pkgTag = "latest"
			}
		}

		packagesDir := filepath.Join(destDir, "packages")
		if err := os.MkdirAll(packagesDir, 0o755); err != nil {
			return err
		}

		versions := make(map[string]string)
		for _, pkg := range core.DefaultPackages {
			asset := fmt.Sprintf("dex-package-%s.tgz", pkg)
			p, cache, err := core.GetTemplateTgzPath(pkgRepo, pkgTag, asset, noCache)
			if err != nil {
				return err
			}
			fmt.Printf("   package %s: %s (%s)\n", pkg, cache, asset)

			outDir := filepath.Join(packagesDir, pkg)
			if err := core.ExtractTemplate(p, outDir); err != nil {
				return err
			}

			pkgJSONPath := filepath.Join(outDir, "package.json")
			if data, err := os.ReadFile(pkgJSONPath); err == nil {
				var parsed struct {
					Name    string `json:"name"`
					Version string `json:"version"`
				}
				if json.Unmarshal(data, &parsed) == nil && parsed.Name != "" && parsed.Version != "" {
					versions[parsed.Name] = parsed.Version
				}
			}
		}

		if err := writePackagesIndex(destDir, core.DefaultPackages); err != nil {
			return err
		}
		updateDexPackageVersions(destDir, versions)

		templateVersion := "unknown"
		if tmpl.source == "github" && tmpl.tag != "" {
			templateVersion = tmpl.tag
		}
		return core.WriteDexMetadata(destDir, templateVersion, templateVersion)
	}); err != nil {
		return err
	}

	if err := core.StepRun("Verify scaffolded files", func() error {
		warnings := runScaffoldChecks(destDir, core.DefaultPackages)
		if len(warnings) > 0 {
			fmt.Fprintln(os.Stderr, "\n⚠ Scaffold checks reported issues:")
			for _, w := range warnings {
				fmt.Fprintf(os.Stderr, "  - %s\n", w)
			}
			fmt.Fprintln(os.Stderr, "  (Continuing as requested.)")
		}
		return nil
	}); err != nil {
		return err
	}

	if !args.HasFlag("no-install") {
		if err := core.StepRun("Install dependencies (bun install)", func() error {
			bunPath, err := exec.LookPath("bun")
			if err != nil {
				return errors.New("bun not found in PATH (pass --no-install to skip)")
			}
			cmd := exec.Command(bunPath, "install")
			cmd.Dir = destDir
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			cmd.Stdin = os.Stdin
			return cmd.Run()
		}); err != nil {
			return err
		}
	} else {
		fmt.Printf("\nℹ Skipping install (use bun install in %s)\n", destDir)
	}

	fmt.Printf("\nScaffolded %s project in %s\n", mode, destDir)
	return nil
}

func normalizeVersionTag(tag string) string {
	if !strings.HasPrefix(tag, "v") && semverStartRe.MatchString(tag) {
		return "v" + tag
	}
	return tag
}

func copyFile(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return err
	}

	perm := info.Mode().Perm()
	if perm == 0 {
		perm = 0o644
	}
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, in)
	closeErr := out.Close()
	if copyErr != nil {
		return copyErr
	}
	return closeErr
}

// CmdSync syncs changed template files from an upstream release into the current Dex project.
func CmdSync(args core.ParsedArgs) error {
	if args.HasFlag("h", "help") {
		fmt.Print(`
Usage: dex sync [options]

Sync files from upstream template release to update your project.

Options:
  --tag <tag>         Target release tag to sync to (default: latest)
  --interactive       Interactively select which changed files to sync
  --force             Force sync even if project is already on the target version
  --repo <repo>       GitHub repo (default: patrickaigbogun/dex)
  -h, --help          Show help
`)
		return nil
	}

	found, err := core.Step("Locate project", func() (*core.ProjectLocation, error) {
		cwd, err := os.Getwd()
		if err != nil {
			return nil, err
		}
		proj, err := core.FindProjectRoot(cwd)
		if err != nil {
			return nil, err
		}
		if proj == nil {
			return nil, errors.New("Not in a Dex project (missing dex.config.*)")
		}
		return proj, nil
	})
	if err != nil {
		return err
	}

	cancelled := false
	metadata, err := core.Step("Load template metadata", func() (*core.DexMetadata, error) {
		meta, err := core.GetTemplateMetadata(found.Root)
		if err != nil {
			return nil, err
		}
		if meta == nil {
			proceed, err := core.PromptConfirm("This is an older Dex project without metadata. Continue syncing?")
			if err != nil {
				return nil, err
			}
			if !proceed {
				cancelled = true
				fmt.Println("Cancelled.")
				return nil, nil
			}
			return &core.DexMetadata{}, nil
		}
		return meta, nil
	})
	if err != nil {
		return err
	}
	if cancelled {
		return nil
	}

	repo, err := core.RepoFromEnvOrFlag(args)
	if err != nil {
		return err
	}

	currentTag := metadata.Version
	if currentTag == "" {
		currentTag = metadata.ReleaseTag
	}

	targetTag := args.GetFlag("tag", "to")
	if targetTag == "" || targetTag == "latest" {
		targetTag, err = core.Step("Fetch latest release info", func() (string, error) {
			rel, err := core.GetLatestReleaseTag(repo)
			if err != nil || rel == "" {
				return "", fmt.Errorf("could not determine latest release tag for %s", repo)
			}
			return rel, nil
		})
		if err != nil {
			return err
		}
	}

	targetTag = normalizeVersionTag(targetTag)

	if currentTag == targetTag && !args.HasFlag("force") {
		fmt.Printf("\nProject is already up to date with template %s (latest) ✓\n", targetTag)
		fmt.Println("Use `dex sync --force` to re-sync files.")
		return nil
	}

	diff, err := core.Step(fmt.Sprintf("Fetch template diff (%s)", targetTag), func() (*core.TemplateDiff, error) {
		d, err := fetchTemplateDiff(repo, targetTag)
		if err != nil || d == nil {
			return nil, fmt.Errorf("diff not found for %s@%s", repo, targetTag)
		}
		return d, nil
	})
	if err != nil {
		return err
	}

	var filesToSync []string
	if args.HasFlag("interactive") {
		filesToSync, err = core.Step("Select files to sync", func() ([]string, error) {
			return core.PromptMultiSelect("Select files to sync:", diff.ChangedFiles)
		})
		if err != nil {
			return err
		}
	} else {
		filesToSync = diff.ChangedFiles
		fmt.Printf("\n▶ Auto-sync all %d changed files\n", len(filesToSync))
	}

	if len(filesToSync) == 0 {
		fmt.Println("No files selected. Exiting.")
		return nil
	}

	if err := core.StepRun("Download and sync template", func() error {
		const templateAsset = "dex-template-spa.tgz"
		noCache := args.HasFlag("no-cache", "fresh")
		tgzPath, _, err := core.GetTemplateTgzPath(repo, targetTag, templateAsset, noCache)
		if err != nil {
			return err
		}

		tempExtractDir, err := os.MkdirTemp("", "dex-sync-*")
		if err != nil {
			return err
		}
		defer os.RemoveAll(tempExtractDir)

		if err := core.ExtractTemplate(tgzPath, tempExtractDir); err != nil {
			return err
		}

		for _, file := range filesToSync {
			src, err := core.SafeJoin(tempExtractDir, file)
			if err != nil {
				return err
			}
			dst, err := core.SafeJoin(found.Root, file)
			if err != nil {
				return err
			}

			if !fileExists(src) {
				fmt.Printf("   ⊘ source not found: %s\n", file)
				continue
			}

			if expectedHash, ok := diff.Checksums[file]; ok && expectedHash != "" {
				actualHash, err := core.ComputeFileSHA256(src)
				if err != nil || actualHash != expectedHash {
					return fmt.Errorf("checksum verification failed for %s (expected %s, got %s)", file, expectedHash, actualHash)
				}
			}

			if err := copyFile(src, dst); err != nil {
				return err
			}
			fmt.Printf("   ✓ %s\n", file)
		}

		if len(diff.DeletedFiles) > 0 {
			var existingDeleted []string
			for _, dFile := range diff.DeletedFiles {
				dDst, err := core.SafeJoin(found.Root, dFile)
				if err != nil {
					return err
				}
				if fileExists(dDst) {
					existingDeleted = append(existingDeleted, dFile)
				}
			}
			if len(existingDeleted) > 0 {
				shouldRemove := args.HasFlag("force")
				if !shouldRemove {
					shouldRemove, err = core.PromptConfirm(fmt.Sprintf(
						"Would you like to remove %d obsolete upstream file(s) (%s)?",
						len(existingDeleted),
						strings.Join(existingDeleted, ", "),
					))
					if err != nil {
						return err
					}
				}
				if shouldRemove {
					for _, dFile := range existingDeleted {
						dDst, err := core.SafeJoin(found.Root, dFile)
						if err != nil {
							return err
						}
						if err := os.Remove(dDst); err != nil {
							return err
						}
						fmt.Printf("   🗑 removed obsolete: %s\n", dFile)
					}
				}
			}
		}

		return nil
	}); err != nil {
		return err
	}

	if err := core.StepRun("Update metadata", func() error {
		return core.WriteDexMetadata(found.Root, targetTag, targetTag)
	}); err != nil {
		return err
	}

	fmt.Printf("\nSynced %d files from %s@%s ✓\n", len(filesToSync), repo, targetTag)
	return nil
}

// CmdTemplate handles `dex template` subcommands (`list`, `cache`, `diff`).
func CmdTemplate(positional []string, args core.ParsedArgs) error {
	var sub string
	if len(positional) > 1 {
		sub = positional[1]
	}
	templatesDir := filepath.Join(core.CacheRootDir(), "templates")

	if sub == "" || sub == "list" || sub == "ls" {
		fmt.Print("Official templates:\n  - spa\n  - mpa\n\n")
		fmt.Printf("Locally cached templates (%s):\n\n", templatesDir)
		if fileExists(templatesDir) {
			repos, err := os.ReadDir(templatesDir)
			if err != nil {
				return err
			}
			for _, repoEnt := range repos {
				if !repoEnt.IsDir() {
					continue
				}
				repoName := strings.ReplaceAll(repoEnt.Name(), "__", "/")
				repoDir := filepath.Join(templatesDir, repoEnt.Name())
				tags, err := os.ReadDir(repoDir)
				if err != nil {
					continue
				}
				for _, tagEnt := range tags {
					if !tagEnt.IsDir() {
						continue
					}
					fmt.Printf("  - %s@%s\n", repoName, tagEnt.Name())
				}
			}
		}
		return nil
	}

	if sub == "cache" {
		var action string
		if len(positional) > 2 {
			action = positional[2]
		}
		if action == "" || action == "list" || action == "ls" {
			fmt.Printf("Cached template assets (%s):\n\n", templatesDir)
			if fileExists(templatesDir) {
				type cachedFile struct {
					path   string
					sizeKB int64
				}
				var files []cachedFile
				_ = filepath.WalkDir(templatesDir, func(p string, d os.DirEntry, err error) error {
					if err != nil || d.IsDir() {
						return nil
					}
					rel, relErr := filepath.Rel(templatesDir, p)
					if relErr != nil {
						return nil
					}
					info, statErr := d.Info()
					if statErr != nil {
						return nil
					}
					kb := int64(math.Round(float64(info.Size()) / 1024.0))
					files = append(files, cachedFile{path: rel, sizeKB: kb})
					return nil
				})
				if len(files) == 0 {
					fmt.Println("  (none)")
				} else {
					for _, f := range files {
						fmt.Printf("  - %s (%d KB)\n", f.path, f.sizeKB)
					}
				}
			}
			return nil
		}

		if action == "clean" {
			var tagArg string
			if len(positional) > 3 {
				tagArg = positional[3]
			}
			all := args.HasFlag("all")

			if all {
				if fileExists(templatesDir) {
					if err := os.RemoveAll(templatesDir); err != nil {
						return err
					}
					fmt.Printf("Removed all cached templates from %s ✓\n", templatesDir)
				} else {
					fmt.Println("No cache found.")
				}
				return nil
			}

			if tagArg != "" {
				if err := core.ValidateTag(tagArg); err != nil {
					return err
				}
				removedCount := 0
				if fileExists(templatesDir) {
					repos, err := os.ReadDir(templatesDir)
					if err != nil {
						return err
					}
					for _, repoEnt := range repos {
						if !repoEnt.IsDir() {
							continue
						}
						tagDir := filepath.Join(templatesDir, repoEnt.Name(), tagArg)
						if fileExists(tagDir) {
							if err := os.RemoveAll(tagDir); err != nil {
								return err
							}
							removedCount++
							fmt.Printf("Removed cached template %s@%s ✓\n", repoEnt.Name(), tagArg)
						}
					}
				}
				if removedCount == 0 {
					fmt.Printf("No cached template found for tag %s\n", tagArg)
				}
				return nil
			}

			if fileExists(templatesDir) {
				if err := os.RemoveAll(templatesDir); err != nil {
					return err
				}
				fmt.Printf("Removed cached templates from %s ✓\n", templatesDir)
			} else {
				fmt.Println("No cache found.")
			}
			return nil
		}
	}

	if sub == "diff" {
		repo, err := core.RepoFromEnvOrFlag(args)
		if err != nil {
			return err
		}
		tag := "latest"
		if len(positional) > 2 && positional[2] != "" {
			tag = positional[2]
		}
		if tag == "latest" {
			latest, err := core.GetLatestReleaseTag(repo)
			if err != nil || latest == "" {
				return fmt.Errorf("could not determine latest release tag for %s", repo)
			}
			tag = latest
		}
		tag = normalizeVersionTag(tag)

		diff, err := core.FetchTemplateDiff(repo, tag)
		if err != nil || diff == nil {
			return fmt.Errorf("diff not found for %s@%s", repo, tag)
		}

		deleted := diff.DeletedFiles
		if deleted == nil {
			deleted = []string{}
		}
		changed := diff.ChangedFiles
		if changed == nil {
			changed = []string{}
		}
		out := struct {
			Version         string   `json:"version"`
			PreviousVersion *string  `json:"previousVersion"`
			ChangedFiles    []string `json:"changedFiles"`
			DeletedFiles    []string `json:"deletedFiles"`
		}{
			Version:         diff.Version,
			PreviousVersion: diff.PreviousVersion,
			ChangedFiles:    changed,
			DeletedFiles:    deleted,
		}
		encoded, err := json.MarshalIndent(out, "", "  ")
		if err != nil {
			return err
		}
		fmt.Println(string(encoded))
		return nil
	}

	return fmt.Errorf("unknown template command: %s", sub)
}
