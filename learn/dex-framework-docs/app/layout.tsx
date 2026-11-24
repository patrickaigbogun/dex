import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    default: 'Dex — Composable Bun-First Framework',
    template: '%s | Dex Docs',
  },
  description:
    'Composable Bun-first full-stack framework with a native Go CLI, file-based React routing, Elysia server helpers, and typed OpenAPI route-tree client.',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
