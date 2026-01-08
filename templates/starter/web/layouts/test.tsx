import type { PropsWithChildren } from 'react'

export default function TestLayout({ children }: PropsWithChildren) {
    return <div className="bg-yellow-500">{children}</div>
}
