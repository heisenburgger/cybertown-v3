import { cn, getParticipantID, toHHMM } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { useState } from 'react'
import { MessageContent } from './MessageContent'
import { Reactions } from './Reactions'
import { Message as TMessage } from '@/types'
import { User } from '@/types'
import { MessageOptions } from './MessageOptions'
import { PencilIcon } from 'lucide-react'
import { EmojiPicker } from '@/components/EmojiPicker'
import { ws } from '@/lib/ws'
import { ReplyTo } from './ReplyTo'
import { DMMessage } from './DMMessage'

export type Props = {
	message: TMessage
	textareaRef: React.RefObject<HTMLTextAreaElement>
	setEditMsgID: (messageID: string | undefined) => void
	setReplyTo: (messageID: string | undefined) => void
	editMsgID: string | undefined
	setPM: (pm: User | null) => void
	messages: TMessage[]
	dm: User | null
}

export function Message(props: Props) {
	const { message, messages } = props
	const user = useAppStore().user
	const replyToMsg = messages.find(
		(msg) => message.replyTo && message.replyTo === msg.id
	)
	const [emojiOpen, setEmojiOpen] = useState(false)
	const isPrivateMessage = props.dm === null && message.participant?.id

	if (props.dm) {
		return <DMMessage {...props} />
	}

	return (
		<div
			className={cn('px-4 py-1 py-2 flex gap-3 items-start group', {
				'bg-brand/10': props.editMsgID === message.id,
				'bg-danger/5': isPrivateMessage,
			})}
			id={`message-${message.id}`}
		>
			<img
				className="w-8 h-8 rounded-md"
				src={message.from.avatar}
				referrerPolicy="no-referrer"
			/>
			<div className="flex-1">
				<div className="flex items-center justify-between text-muted text-sm mb-1 gap-4">
					<div className="touch-none select-none">
						{props.dm === null &&
						message.participant &&
						message.from?.id === user?.id ? (
							<div className="flex gap-2 items-center mb-1">
								<img
									className="w-6 h-6 rounded-md"
									src={message.participant.avatar}
									referrerPolicy="no-referrer"
								/>
								<p>{message.participant.username}</p>
							</div>
						) : (
							<p>
								{message.from.username}
								<MessageOptions {...props} setEmojiOpen={setEmojiOpen} />
							</p>
						)}
					</div>
					<div className="flex gap-2 items-center flex-shrink-0">
						{message.isEdited && (
							<PencilIcon size={14} className="text-muted" />
						)}
						<span className="text-xs">{toHHMM(message.createdAt)}</span>
						<EmojiPicker
							align="start"
							open={emojiOpen}
							setOpen={setEmojiOpen}
							onSelect={(id) => {
								ws.reactionToMsg(
									props.message.id,
									id,
									getParticipantID(props.message, user!),
									false
								)
								setEmojiOpen(false)
							}}
							trigger={null}
						/>
					</div>
				</div>
				{replyToMsg && (
					<ReplyTo message={replyToMsg} isDM={props.dm !== null} />
				)}
				<MessageContent message={message} />
				{!message.isDeleted && <Reactions message={message} dm={props.dm} />}
			</div>
		</div>
	)
}
