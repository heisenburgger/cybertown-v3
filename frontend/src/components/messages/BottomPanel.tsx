import { RoomRes, User } from '@/types'
import { Message as TMessage } from '@/types'
import { EmojiPicker } from '../EmojiPicker'
import { EmojiSearch } from './EmojiSearch'
import { MentionParticipants } from './MentionParticipants'
import { PM } from './PM'
import { ReplyTo } from './ReplyTo'
import { SendMessage } from './SendMessage'
import { RefObject, useEffect, useState } from 'react'
import { useMention } from './hooks/useMention'
import { Emoji, useEmojiSearch } from './hooks/useEmojiSearch'
import { useAppStore } from '@/stores/appStore'
import { CircleX as CloseIcon, SmilePlus as EmojiIcon } from 'lucide-react'
import { ws } from '@/lib/ws'
import { getParticipantID } from '@/lib/utils'
import { AI } from './AI'
import { NewMessages } from './NewMessages'

type Props = {
	pm: User | null
	setPM: (pm: User | null) => void
	dm: User | null

	room: RoomRes | null
	messages: TMessage[]

	replyTo: string | undefined
	setReplyTo: (replyTo: string | undefined) => void

	textareaRef: React.RefObject<HTMLTextAreaElement>

	editMsgID: string | undefined
	setEditMsgID: (editMsgID: string | undefined) => void

	messagesEndRef: RefObject<HTMLDivElement>
}

export function BottomPanel(props: Props) {
	const user = useAppStore().user
	const replyToMsg = props.messages.find(
		(msg) => props.replyTo && msg.id === props.replyTo
	)
	const [content, setContent] = useState('')
	const [emojiOpen, setEmojiOpen] = useState(false)

	const { search, setSearch, mentionedParticipants } = useMention(
		content,
		props.room
	)

	const {
		search: emojiSearch,
		setSearch: setEmojiSearch,
		emojis,
	} = useEmojiSearch(content)

	function selectParticipant(participant: User) {
		setSearch({
			query: '',
			show: false,
		})
		const index = content.lastIndexOf('@')
		if (index === -1) {
			return
		}
		let at = '`@'
		if (index !== 0 && content[index - 1] !== ' ') {
			at = ' `@'
		}
		const value = content.substring(0, index) + at + participant.username + '` '
		setContent(value)
	}

	function selectEmoji(emoji: Emoji) {
		setEmojiSearch({
			query: '',
			show: false,
		})
		const index = content.lastIndexOf(':')
		if (index === -1) {
			return
		}
		const value = content.substring(0, index) + ' ' + emoji.emoji + ' '
		setContent(value)
	}

	// am now lazy to lift the state up and do it declaratively
	useEffect(() => {
		if (props.pm) {
			props.setEditMsgID(undefined)
			setContent('')
		}
	}, [props.pm])

	return (
		<div className="flex flex-col gap-2 border-t border-border p-2.5 relative">
			<div className="flex">
				{props.room && (
					<MentionParticipants
						setSearch={setSearch}
						search={search}
						selectParticipant={selectParticipant}
						textareaRef={props.textareaRef}
						room={props.room}
						mentionedParticipants={mentionedParticipants}
					/>
				)}

				<EmojiSearch
					setSearch={setEmojiSearch}
					search={emojiSearch}
					textareaRef={props.textareaRef}
					emojis={emojis}
					selectEmoji={selectEmoji}
				/>

				<div className="gap-1 ml-auto mr-1.5 flex items-end gap-1.5">
					{!props.dm && <AI />}

					<EmojiPicker
						trigger={
							<button>
								<EmojiIcon strokeWidth={1.5} size={20} className="text-muted" />
							</button>
						}
						open={emojiOpen}
						setOpen={setEmojiOpen}
						onSelect={(_, emoji) => {
							const participantID =
								props.pm?.id ||
								getParticipantID(replyToMsg, user!) ||
								props.dm?.id
							ws.newMessage(
								emoji,
								props.replyTo,
								participantID,
								props.dm !== null
							)
							props.setReplyTo(undefined)
							setEmojiOpen(false)
						}}
					/>
					{props.editMsgID && (
						<button
							className="ml-auto"
							onClick={() => {
								props.setEditMsgID(undefined)
								setContent('')
							}}
						>
							<CloseIcon size={20} className="text-muted" />
						</button>
					)}
				</div>
			</div>

			<ReplyTo
				replyTo={props.replyTo}
				setReplyTo={props.setReplyTo}
				pm={props.pm}
				messages={props.messages}
			/>

			{!props.dm && <NewMessages messagesEndRef={props.messagesEndRef} />}

			<PM pm={props.pm} setPM={props.setPM} />

			<SendMessage
				messages={props.messages}
				setReplyTo={props.setReplyTo}
				replyTo={props.replyTo}
				content={content}
				setContent={setContent}
				search={search}
				setEditMsgID={props.setEditMsgID}
				editMsgID={props.editMsgID}
				selectParticipant={selectParticipant}
				selectEmoji={selectEmoji}
				emojis={emojis}
				emojiSearch={emojiSearch}
				mentionedParticipants={mentionedParticipants}
				textareaRef={props.textareaRef}
				pm={props.pm}
				dm={props.dm}
			/>
		</div>
	)
}
