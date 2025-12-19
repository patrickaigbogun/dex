import type { PropsWithChildren } from 'react'

import clsx from 'clsx'

import '@web/styles/index.css'


interface LayoutProps extends PropsWithChildren {
	className?: string
}

export default function GlobalLayout({ children, className }: LayoutProps) {
	return (
			<div
				className={clsx(
					'flex flex-col justify-center items-center w-full min-h-screen',
					className
				)}
			>
				{children}
			</div>
	)
}