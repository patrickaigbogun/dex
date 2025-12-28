export type TargetType = 'currency' | 'points'

export type Target = {
	id: string
	title: string
	type: TargetType
	current: number
	target: number
}
