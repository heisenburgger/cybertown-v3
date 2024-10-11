import { useState } from 'react'
import { TextareaSearch } from './hooks/useMention'
import { User } from '@/types'
import { getParticipantID } from '@/lib/utils'
import { ws } from '@/lib/ws'
import { useAppStore } from '@/stores/appStore'
import { Emoji } from './hooks/useEmojiSearch'
import { Message } from '@/types'

type Props = {
	content: string
	setContent: (content: string) => void

	textareaRef: React.RefObject<HTMLTextAreaElement>

	search: TextareaSearch
	emojiSearch: TextareaSearch

	selectParticipant: (participant: User) => void
	mentionedParticipants: User[]

	selectEmoji: (emoji: Emoji) => void
	emojis: Emoji[]

	editMsgID: string | undefined
	setEditMsgID: (editMsgID: string | undefined) => void

	replyTo: string | undefined
	setReplyTo: (replyTo: string | undefined) => void

	pm: User | null
	dm: User | null

	messages: Message[]
}

export function SendMessage(props: Props) {
	const { messages } = props
	const user = useAppStore().user
	const [error, setError] = useState('')

	const {
		content,
		setContent,
		textareaRef,
		mentionedParticipants,
		search,
		selectParticipant,
		editMsgID,
		setEditMsgID,
		replyTo,
		setReplyTo,
		emojiSearch,
		emojis,
		selectEmoji,
	} = props

	const replyToMsg = messages.find((msg) => replyTo && msg.id === replyTo)
	const editMsg = messages.find((msg) => editMsgID && msg.id === editMsgID)

	function handleNewMessage(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (
			(e.key === 'Enter' || e.key === 'Tab') &&
			search.show &&
			mentionedParticipants.length
		) {
			e.preventDefault()
			selectParticipant(mentionedParticipants[0])
			return
		}

		if (
			(e.key === 'Enter' || e.key === 'Tab') &&
			emojiSearch.show &&
			emojis.length
		) {
			e.preventDefault()
			selectEmoji(emojis[0])
			return
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()

			const value = content.trim()
			if (!value.trim().length) {
				return
			}

			if (value.trim().length > 1024) {
				setError('Exceeded maximum of 1024 characters')
				return
			}

			if (editMsgID) {
				ws.editMsg(
					editMsgID,
					value.trim(),
					editMsg?.participant?.id || props.dm?.id,
					props.dm !== null
				)
			} else {
				const participantID =
					props.pm?.id || getParticipantID(replyToMsg, user!) || props.dm?.id
				ws.newMessage(value.trim(), replyTo, participantID, props.dm !== null)
			}

			setEditMsgID(undefined)
			setReplyTo(undefined)
			setContent('')
		}
	}

	// useEffect(() => {
	// 	setTimeout(() => {
	// 		if (textareaRef.current) {
	// 			textareaRef.current.focus()
	// 		}
	// 	}, 0)
	// }, [])

	return (
		<>
			<textarea
				id="messages-textarea"
				onChange={(e) => {
					setError('')
					setContent(e.target.value)
				}}
				ref={textareaRef}
				value={content}
				onKeyDown={handleNewMessage}
				placeholder="You can use @ to mention someone"
				rows={3}
				className="resize-none bg-bg p-2 rounded-md border border-border scroller focus:border-transparent"
			/>
			{error ? <span className="text-danger text-sm">{error}</span> : null}
		</>
	)
}
