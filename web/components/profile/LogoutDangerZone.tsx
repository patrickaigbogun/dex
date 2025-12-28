import { Button } from '@base-ui/react/button'

export function LogoutDangerZone(props: { onSignOut: () => void }) {
	return (
		<div className="mt-8">
			<Button
				type="button"
				className="w-full rounded-md border border-[var(--danger)] px-3 py-2 text-[var(--danger)]"
				onClick={props.onSignOut}
			>
				Sign Out
			</Button>
		</div>
	)
}
