package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/patrickaigbogun/dex/cli/internal/core"
	"github.com/patrickaigbogun/dex/cli/internal/pie"
	"github.com/patrickaigbogun/dex/cli/internal/runner"
	"github.com/patrickaigbogun/dex/cli/internal/scaffold"
	"github.com/patrickaigbogun/dex/cli/internal/version"
)

// Version is set at compile time via -ldflags="-X main.Version=vX.Y.Z"
var Version = "0.4.0"

func printUsage(w io.Writer) {
	fmt.Fprint(w, `dex

Usage:
  dex scaffold <dir>
  dex sync [--interactive]
  dex template <list|cache|diff>
  dex update [version] [--force]
  dex versions | dex list
  dex use <version>
  dex tag <patch|minor|major>
  dex build
  dex deploy <vercel|netlify|cloudflare|railway|render|docker> [--dry-run] [--prod]
  dex start [-p]
  dex pie generate [spec-url-or-file] [--out <path>] [--prefix <prefix>]

Update options:
  [version]                  Target version/tag (default: latest release)
  --force                    Force re-download even if already on this version

Pie options:
  --out <path>               Output file path (default: core/api/generated.ts)
  --prefix <prefix>          Path prefix to strip from route tree (default: /api)
  --url <baseUrl>            Default API base URL (default from dex.config or env)

Scaffold options:
  --repo <owner/repo>        GitHub repo containing release templates
  --tag <tag|latest>         Release tag (default: latest)
  --packages-repo <owner/repo>  GitHub repo containing dex-package-*.tgz assets
  --packages-tag <tag|latest>   Release tag for dex-package-*.tgz assets
  --template <path>          Use local template .tgz instead of GitHub
  --template-url <url>       Download template .tgz from a URL (skips GitHub)
  --no-install               Do not run bun install
  --no-cache, --fresh        Bypass local template cache

Sync options:
  --interactive              Interactively select files to sync (default: all)
  --repo <owner/repo>        Template repo (default from .dex/metadata.json)
  --tag <tag>                Release tag (default: latest)
  --force                    Force sync even if project is already on target version
  --no-cache, --fresh        Bypass local template cache

Template options:
  dex template list | ls     List official and locally cached templates
  dex template cache list    List cached template tarballs and sizes
  dex template cache clean [--all | <tag>]  Clear cached template tarballs
  dex template diff [tag]    Show changed and deleted files for a template tag

Start options:
  -p                         Production mode (NODE_ENV=production)

Deploy options:
  --dry-run                  Prepare deployment artifacts without invoking provider CLI
  --prod                     Deploy to production (passed through to provider CLI)

Tag options:
  patch                      Bump SemVer patch (e.g. v0.1.44 -> v0.1.45)
  minor                      Bump SemVer minor (e.g. v0.1.44 -> v0.2.0)
  major                      Bump SemVer major (e.g. v0.1.44 -> v1.0.0)

Version:
  -v, --version              Show CLI version
  --version -f               Show framework template version (if in scaffolded project)

Environment:
  DEX_HOME                   Custom Dex directory (default: ~/.dex)
  DEX_TEMPLATE_REPO          Default template repo (owner/repo)
  DEX_TEMPLATE_TGZ           Local template .tgz path (skips GitHub)
  DEX_TEMPLATE_URL           Template .tgz URL (skips GitHub)
  DEX_PACKAGE_REPO           Package repo (owner/repo) for dex-package-*.tgz assets
  DEX_PACKAGE_TAG            Release tag for dex-package-*.tgz (default: template tag)
  DEX_CACHE_DIR              Optional cache directory for template downloads
  DEX_TEMPLATE_CACHE_TTL_MS  TTL for cached 'latest' template (default: 1800000)
  DEX_FETCH_TIMEOUT_MS       Network timeout for GitHub fetches (default: 30000)
  GITHUB_TOKEN               Optional GitHub token (avoids rate limits)
`)
}

func usageExit(code int) {
	if code == 0 {
		printUsage(os.Stdout)
	} else {
		printUsage(os.Stderr)
	}
	os.Exit(code)
}

func cmdPieGenerate(args core.ParsedArgs) error {
	cwd, err := os.Getwd()
	if err != nil {
		return err
	}
	found, err := core.Step("Locate project", func() (*core.ProjectLocation, error) {
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

	cfg, err := core.LoadDexConfig(found)
	if err != nil {
		cfg = &core.DexConfig{}
	}

	var spec string
	if len(args.Positional) > 2 {
		spec = args.Positional[2]
	}
	if spec == "" {
		spec = args.GetFlag("spec")
	}
	if spec == "" {
		spec = cfg.APISpec
	}
	if spec == "" {
		spec = os.Getenv("DEX_API_SPEC")
	}
	if spec == "" {
		return errors.New("Missing OpenAPI spec. Provide spec URL/path: dex pie generate <url-or-path>, or set `apiSpec` in dex.config.ts")
	}

	outTS := args.GetFlag("out", "outTs")
	if outTS == "" {
		outTS = cfg.OutAPITs
	}
	if outTS == "" {
		outTS = "core/api/generated.ts"
	}

	prefix := args.GetFlag("prefix")
	if prefix == "" {
		prefix = cfg.APIPrefix
	}
	if prefix == "" {
		prefix = "/api"
	}

	defaultBaseURL := args.GetFlag("url")
	if defaultBaseURL == "" {
		defaultBaseURL = cfg.APIURL
	}
	if defaultBaseURL == "" {
		defaultBaseURL = os.Getenv("PUBLIC_API_URL")
	}
	if defaultBaseURL == "" {
		defaultBaseURL = os.Getenv("NEXT_PUBLIC_API_URL")
	}

	generatedPath, err := core.Step("Generate API client from OpenAPI", func() (string, error) {
		return pie.GenerateAPI(pie.GenerateOptions{
			Spec:           spec,
			OutTS:          outTS,
			Root:           found.Root,
			Prefix:         prefix,
			DefaultBaseURL: defaultBaseURL,
		})
	})
	if err != nil {
		return err
	}

	rel, relErr := filepath.Rel(found.Root, generatedPath)
	if relErr != nil {
		rel = generatedPath
	}
	fmt.Printf("\nGenerated typed API route tree: %s ✓\n", rel)
	return nil
}

func run(argv []string) error {
	args := core.ParseArgs(argv)
	var cmd string
	if len(args.Positional) > 0 {
		cmd = args.Positional[0]
	}

	cwd, _ := os.Getwd()

	if args.HasFlag("v", "version") {
		return version.CmdVersion(Version, args.HasFlag("f"), cwd)
	}

	if cmd == "" || cmd == "-h" || cmd == "--help" || cmd == "help" || args.HasFlag("h", "help") {
		if cmd != "sync" {
			printUsage(os.Stdout)
			return nil
		}
	}

	switch cmd {
	case "update", "upgrade":
		repo, err := core.RepoFromEnvOrFlag(args)
		if err != nil {
			return err
		}
		targetTag := ""
		if len(args.Positional) > 1 {
			targetTag = args.Positional[1]
		}
		if targetTag == "" {
			targetTag = args.GetFlag("tag")
		}
		return version.CmdUpdate(
			targetTag,
			repo,
			args.HasFlag("force"),
			Version,
			core.GetLatestReleaseTag,
			core.DownloadToFile,
		)

	case "versions", "list", "ls":
		return version.CmdVersions()

	case "use":
		var verArg string
		if len(args.Positional) > 1 {
			verArg = args.Positional[1]
		}
		return version.CmdUse(verArg)

	case "scaffold":
		if len(args.Positional) < 2 || args.Positional[1] == "" {
			printUsage(os.Stderr)
			return errors.New("missing destination directory for scaffold")
		}
		return scaffold.CmdScaffold(args.Positional[1], args)

	case "sync":
		return scaffold.CmdSync(args)

	case "template":
		return scaffold.CmdTemplate(args.Positional, args)

	case "build":
		found, err := core.FindProjectRoot(cwd)
		if err != nil {
			return err
		}
		if found == nil {
			return errors.New("Not in a Dex project (missing dex.config.*)")
		}
		return runner.CmdBuild(found.Root)

	case "deploy":
		if len(args.Positional) < 2 || args.Positional[1] == "" {
			printUsage(os.Stderr)
			return errors.New("missing deploy provider (expected one of: vercel, netlify, cloudflare, railway, render, docker)")
		}
		provider := args.Positional[1]
		if !runner.IsValidDeployProvider(provider) {
			return fmt.Errorf("unsupported deploy provider %q (expected one of: vercel, netlify, cloudflare, railway, render, docker)", provider)
		}
		found, err := core.FindProjectRoot(cwd)
		if err != nil {
			return err
		}
		if found == nil {
			return errors.New("Not in a Dex project (missing dex.config.*)")
		}
		return runner.CmdDeploy(found.Root, provider, args.HasFlag("dry-run"), args.HasFlag("prod"))

	case "start", "dev":
		found, err := core.FindProjectRoot(cwd)
		if err != nil {
			return err
		}
		if found == nil {
			return errors.New("Not in a Dex project (missing dex.config.*)")
		}
		cfg, _ := core.LoadDexConfig(found)
		port := 0
		if cfg != nil {
			port = cfg.Port
		}
		return runner.CmdStart(found.Root, args.HasFlag("p"), port)

	case "tag":
		var kind string
		if len(args.Positional) > 1 {
			kind = args.Positional[1]
		}
		if kind != "patch" && kind != "minor" && kind != "major" {
			printUsage(os.Stderr)
			return fmt.Errorf("invalid tag kind: %s", kind)
		}
		return version.CmdTag(kind, cwd)

	case "pie", "api":
		var sub string
		if len(args.Positional) > 1 {
			sub = args.Positional[1]
		}
		if sub == "" || sub == "generate" {
			return cmdPieGenerate(args)
		}
		printUsage(os.Stderr)
		return fmt.Errorf("unknown pie subcommand: %s", sub)

	default:
		printUsage(os.Stderr)
		return fmt.Errorf("Unknown command: %s", cmd)
	}
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
}
