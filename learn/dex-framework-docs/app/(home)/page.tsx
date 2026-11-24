import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';

const pillars = [
  {
    name: 'Native Go CLI',
    slug: 'cli',
    href: '/docs/cli',
    icon: Terminal,
    description:
      'Sub-5ms standalone Go binary for scaffolding, upstream template syncing, multi-version switching, builds, and OpenAPI codegen.',
  },
  {
    name: 'Router',
    slug: '@dex/router',
    href: '/docs/router',
    icon: Layers,
    description:
      'File-based React routing with concurrent transitions, intent prefetching, nested layouts, subdomain mounting, and error boundaries.',
  },
  {
    name: 'Server',
    slug: '@dex/server',
    href: '/docs/server',
    icon: Globe,
    description:
      'Elysia helpers for path-safe static assets, SSG-aware SPA fallback, Google Fonts injection, head metadata, and SSE dev reload.',
  },
  {
    name: 'Pie API Client',
    slug: '@dex/pie',
    href: '/docs/pie',
    icon: Code2,
    description:
      'Framework-agnostic typed route-tree HTTP client with JSON/YAML OpenAPI code generation, lifecycle hooks, and idempotent retries.',
  },
  {
    name: 'Dev & Build',
    slug: '@dex/dev',
    href: '/docs/dev',
    icon: Zap,
    description:
      'Parallel dev supervisor and production build pipeline with ESM code splitting, Tailwind CSS compilation, SSG prerendering, and compiled server binaries.',
  },
];

const highlights = [
  {
    title: '6 MB Native Go CLI',
    icon: Cpu,
    description:
      'Zero-dependency Go binary with sub-5ms startup, ~/.dex multi-version management, interactive template sync, and release diffing.',
  },
  {
    title: 'ESM Code Splitting & Cache Busting',
    icon: Zap,
    description:
      'Production builds emit client.js and content-hashed chunks/[name]-[hash].js with automatic ?v=<hash> asset cache busting in HTML.',
  },
  {
    title: 'Subdomain Mounting & Canonical Redirects',
    icon: Globe,
    description:
      'Map subdomains like docs or admin to route prefixes in dex.config.ts with clean client URLs and canonical 308 redirects.',
  },
  {
    title: 'Google Variable Fonts & Tailwind v4 @theme',
    icon: Sparkles,
    description:
      'Configure fonts once in dex.config.ts to inject preconnect links, CSS variables, utility classes, and Tailwind v4 @theme definitions.',
  },
  {
    title: 'SSG Prerendering & Head Metadata',
    icon: BookOpen,
    description:
      'Pre-render static routes to build/__ssg/ with RouterContext.Provider, Open Graph/Twitter tags, and Google Fonts baked into HTML.',
  },
  {
    title: '@dex/pie YAML OpenAPI & Retry Safety',
    icon: ShieldCheck,
    description:
      'Generate typed route trees from JSON or YAML OpenAPI specs and retry idempotent methods safely with exponential backoff and jitter.',
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden border-b border-fd-border">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-secondary/60 px-3.5 py-1.5 text-xs font-medium text-fd-foreground">
              <Sparkles className="size-3.5 text-fd-primary" />
              <span>Dex v0.4.0 • Native Go CLI &amp; Bun Runtime</span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-fd-foreground sm:text-6xl">
              Composable, Bun-First Full-Stack Framework
            </h1>

            <p className="mt-6 text-base leading-relaxed text-fd-muted-foreground sm:text-lg">
              Build fast full-stack web apps with a native Go CLI, file-based React routing,
              Elysia server primitives, SSG prerendering, and a typed OpenAPI route-tree client.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90"
              >
                <span>Read Documentation</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/docs/getting-started/your-first-app"
                className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-sm font-semibold text-fd-foreground transition-colors hover:bg-fd-accent"
              >
                <BookOpen className="size-4" />
                <span>Build Your First App</span>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
            <div className="flex items-center justify-between border-b border-fd-border bg-fd-secondary/40 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-fd-muted-foreground">
                <Terminal className="size-3.5" />
                <span>Quick Start</span>
              </div>
              <span className="text-xs text-fd-muted-foreground">macOS &amp; Linux</span>
            </div>
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-fd-foreground">
              <code>{`# Install the native Go CLI
curl -fsSL https://raw.githubusercontent.com/patrickaigbogun/dex/master/install.sh | bash

# Scaffold a new app and start the dev server
dex scaffold my-app && cd my-app && dex start`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl">
            5-Pillar Architecture
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground sm:text-base">
            Every layer of Dex is a focused, composable package that works together out of the box
            or standalone in your own stack.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.href}
                href={pillar.href}
                className="group flex flex-col justify-between rounded-xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary/50 hover:bg-fd-accent/40"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex size-10 items-center justify-center rounded-lg border border-fd-border bg-fd-secondary/60 text-fd-foreground">
                      <Icon className="size-5" />
                    </div>
                    <span className="rounded-md border border-fd-border bg-fd-secondary/40 px-2.5 py-0.5 text-xs font-medium text-fd-muted-foreground">
                      {pillar.slug}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-fd-foreground">{pillar.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-fd-primary">
                  <span>Explore {pillar.name}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-fd-border bg-fd-secondary/20">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fd-primary">
                <Sparkles className="size-3.5" />
                <span>Release Highlights</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl">
                What&apos;s New in v0.4.0
              </h2>
            </div>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-fd-primary hover:underline"
            >
              <span>Get started with v0.4.0</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-fd-border bg-fd-card p-6"
                >
                  <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-fd-secondary/70 text-fd-foreground">
                    <Icon className="size-4.5" />
                  </div>
                  <h3 className="text-base font-semibold text-fd-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
