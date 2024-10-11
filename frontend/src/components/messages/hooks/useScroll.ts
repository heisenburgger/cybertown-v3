import { useAppStore } from '@/stores/appStore'
import { Message } from '@/types'
import { RefObject, useEffect } from 'react'
import { useScrollPercentage } from './useScrollPercentage'
import { User } from '@/types'

export function useScroll(
	dm: User | null,
	messagesRef: RefObject<HTMLDivElement>,
	messagesEndRef: RefObject<HTMLDivElement>,
	initialMessages: Message[],
	messages: Message[]
) {
	const user = useAppStore().user
	useScrollPercentage(dm, messagesRef)
	const isScrollNear = useAppStore().scroll.percent >= 98
	const hasScrolledDown = useAppStore().scroll.hasScrolledDown

	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView()
		}
	}, [initialMessages.length])

	useEffect(() => {
		if (!messages.length) {
			return
		}
		const lastMessage = messages[messages.length - 1]
		const isFromMe = lastMessage.from.id === user?.id
		const isFocussed = document.hasFocus()

		if (
			(isFromMe || isScrollNear || !hasScrolledDown) &&
			isFocussed &&
			messagesEndRef.current
		) {
			messagesEndRef.current.scrollIntoView()
		}
	}, [messages.length])
}
