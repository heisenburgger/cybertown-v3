import { User } from '@/types'
import { CircleX as CloseIcon } from 'lucide-react'

type Props = {
	pm: User | null
	setPM: (pm: User | null) => void
}

export function PM(props: Props) {
	if (!props.pm) {
		return null
	}

	return (
		<div className="flex gap-3 items-start bg-bg-2 p-2 absolute top-0 left-0 -translate-y-full w-full">
			<img
				className="w-6 h-6 rounded-md"
				src={props.pm.avatar}
				referrerPolicy="no-referrer"
			/>
			<div className="flex-1 flex flex-col gap-1 text-sm overflow-hidden">
				<div className="flex items-center justify-between gap-2">
					<div className="overflow-hidden">
						<p className="text-danger mb-1">Private message to:</p>
						<p className="ellipsis">{props.pm.username}</p>
					</div>
					<button onClick={() => props.setPM(null)}>
						<CloseIcon size={20} className="text-muted" />
					</button>
				</div>
			</div>
		</div>
	)
}
