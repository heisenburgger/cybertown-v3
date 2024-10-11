import { Message } from '@/types'
import { MessageContent } from './MessageContent'
import { scrollToMessage } from '@/lib/utils'

type Props = {
	message: Message
	isDM: boolean
}

// that moment when you realize I have another component
// with the same name but different usage, hahaha, excuse me!
export function ReplyTo(props: Props) {
	const { message } = props

	return (
		<div
			role="button"
			onClick={() => scrollToMessage(message.id)}
			className="flex gap-3 items-start rounded-md border-l-2 border-yellow-500 bg-bg-2 p-2 mb-1"
		>
			{!props.isDM && (
				<img
					className="w-6 h-6 rounded-md"
					src={message.from.avatar}
					referrerPolicy="no-referrer"
				/>
			)}
			<div className="flex-1 flex flex-col gap-1 text-sm">
				<p className="text-muted">{message.from.username}</p>
				<MessageContent message={message} />
			</div>
		</div>
	)
}
