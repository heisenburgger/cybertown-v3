import { cn, scrollToMessage } from '@/lib/utils'
import { User } from '@/types'
import { CircleX as CloseIcon } from 'lucide-react'
import { Message } from '@/types'

type Props = {
	replyTo: string | undefined
	setReplyTo: (replyTo: string | undefined) => void
	pm: User | null
	messages: Message[]
}

export function ReplyTo(props: Props) {
	const { messages } = props
	const replyToMsg = messages.find(
		(msg) => props.replyTo && msg.id === props.replyTo
	)

	if (!replyToMsg) {
		return
	}

	return (
		<div
			role="button"
			onClick={() => {
				scrollToMessage(replyToMsg.id)
			}}
			className={cn(
				'flex gap-3 items-start bg-bg-2 p-2 absolute top-0 left-0 -translate-y-full w-full',
				{
					'-top-[60px]': props.pm,
				}
			)}
		>
			<img
				className="w-6 h-6 rounded-md"
				src={replyToMsg.from.avatar}
				referrerPolicy="no-referrer"
			/>
			<div className="flex-1 flex flex-col gap-1 text-sm overflow-x-hidden">
				<div className="flex items-center justify-between">
					<p className="text-muted">{replyToMsg.from.username}</p>
					<button
						className="focus:ring-0"
						onClick={(e) => {
							props.setReplyTo(undefined)
							e.stopPropagation()
						}}
					>
						<CloseIcon size={20} className="text-muted" />
					</button>
				</div>
				<p className="ellipsis">{replyToMsg.content}</p>
			</div>
		</div>
	)
}
