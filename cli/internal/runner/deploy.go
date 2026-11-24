package runner

import (
	"fmt"
	"os/exec"
	"slices"
	"strings"
)

// ValidDeployProviders lists the supported deployment targets for `dex deploy`.
var ValidDeployProviders = []string{"vercel", "netlify", "cloudflare", "railway", "render", "docker"}

// IsValidDeployProvider reports whether provider is in the supported deploy allowlist.
func IsValidDeployProvider(provider string) bool {
	return slices.Contains(ValidDeployProviders, provider)
}

func deployCommandHint(provider string, prod bool) string {
	switch provider {
	case "vercel":
		if prod {
			return "vercel deploy --prebuilt --prod"
		}
		return "vercel deploy --prebuilt"
	case "netlify":
		if prod {
			return "netlify deploy --prod --dir=build"
		}
		return "netlify deploy --dir=build"
	case "cloudflare":
		return "wrangler deploy"
	case "railway":
		return "railway up"
	case "render":
		return "render blueprint apply"
	case "docker":
		return "docker compose up --build -d"
	default:
		return ""
	}
}

// CmdDeploy prepares deployment artifacts for the target provider and optionally deploys them.
func CmdDeploy(projectRoot, provider string, dryRun, prod bool) error {
	if !IsValidDeployProvider(provider) {
		return fmt.Errorf("unsupported deploy provider %q (expected one of: %s)", provider, strings.Join(ValidDeployProviders, ", "))
	}

	script := "import { dexPrepareProvider } from '@dex/dev'; const provider = process.env.DEX_DEPLOY_PROVIDER; if (!provider) throw new Error('Missing DEX_DEPLOY_PROVIDER'); const res = await dexPrepareProvider({ rootDir: process.cwd(), provider: provider as any }); if (res.filesWritten.length > 0) { console.log('Generated deployment files:'); for (const f of res.filesWritten) console.log('  - ' + f); }"

	extraEnv := map[string]string{
		"DEX_DEPLOY_PROVIDER": provider,
	}
	if err := RunCommand("bun", []string{"-e", script}, projectRoot, extraEnv); err != nil {
		return err
	}

	if !dryRun && provider == "vercel" {
		if vercelBin, err := exec.LookPath("vercel"); err == nil {
			args := []string{"deploy", "--prebuilt"}
			if prod {
				args = append(args, "--prod")
			}
			return RunCommand(vercelBin, args, projectRoot, nil)
		}
	}

	if hint := deployCommandHint(provider, prod); hint != "" {
		fmt.Printf("\nNext step (%s): run `%s`\n", provider, hint)
	}
	return nil
}
