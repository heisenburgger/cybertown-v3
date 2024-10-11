import { useUpdateDM } from '@/hooks/mutations/useUpdateDM'
import { bc } from '@/lib/bc'
import { useAppStore } from '@/stores/appStore'
import { Message } from '@/types'
import { useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'

export function useReadMessage(
	participantID: number | undefined,
	initialMessages: Message[],
	messages: Message[]
) {
	const user = useAppStore().user
	const { mutate: updateDM } = useUpdateDM()
	const { ref, inView } = useInView()
	const lastMessageRef = useRef<string | null>(null)
	const setDMRead = useAppStore().setDMReadForParticipant

	useEffect(() => {
		let timeoutID: ReturnType<typeof setTimeout>

		if (inView && participantID && document.hasFocus()) {
			timeoutID = setTimeout(() => {
				const allMessages = [...initialMessages, ...messages]
				if (!allMessages.length) {
					return
				}

				const lastMessage = allMessages[allMessages.length - 1]
				const isFromMe = lastMessage.from.id === user?.id
				if (isFromMe || lastMessageRef.current === lastMessage.id) {
					return
				}

				updateDM(participantID)
				setDMRead(participantID)
				bc.sendMessage({ name: 'DM_READ_PARTICIPANT', participantID })
				lastMessageRef.current = lastMessage.id
			}, 300)
		}

		return () => clearTimeout(timeoutID)
	}, [messages, initialMessages, inView])

	return ref
}
