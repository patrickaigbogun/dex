import type { PropsWithChildren } from 'react'

export default function AboutLayout({ children }: PropsWithChildren) {
    return <div className="bg-red-500 h-screen">{children}</div>
}
