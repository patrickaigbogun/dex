import type { PropsWithChildren } from 'react'

import { NavBar } from '@web/components/layout/NavBar'

export default function DashboardLayout({ children }: PropsWithChildren) {
	return (
		<div className="min-h-screen w-full">
			<div className="mx-auto w-full max-w-[1000px]">
				<div className="pb-20">{children}</div>
			</div>
			<NavBar />
		</div>
	)
}
