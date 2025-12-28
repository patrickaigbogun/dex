import type { PropsWithChildren } from 'react'

export default function GlobalLayout({ children }: PropsWithChildren) {
	return <div className="min-h-screen w-full">{children}</div>
}
