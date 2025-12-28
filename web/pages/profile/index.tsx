import { LogoutDangerZone } from '@web/components/profile/LogoutDangerZone'
import { SettingsList } from '@web/components/profile/SettingsList'
import { WalletCard } from '@web/components/profile/WalletCard'

export const metadata = {
	title: 'Profile',
}

export const layout = 'dashboard'

export default function Page() {
	return (
		<main className="w-full max-w-[600px] p-4 space-y-4">
			<section>
				<h1 className="text-2xl font-semibold text-[var(--text)]">Profile</h1>
				<p className="mt-1 text-sm text-[var(--text-muted)]">
					The Home for your account settings and information.
				</p>
			</section>

			<WalletCard total={420} />
			<SettingsList />
			<LogoutDangerZone onSignOut={() => {}} />
		</main>
	)
}