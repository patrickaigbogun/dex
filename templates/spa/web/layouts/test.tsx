import type { PropsWithChildren } from 'react'

// Default render strategy for pages using this layout.
export const render = 'ssg'

export default function TestLayout({ children }: PropsWithChildren) {
    return <div className="bg-yellow-500 max-w-[85%]  text-white h-screen">{children}</div>
}
