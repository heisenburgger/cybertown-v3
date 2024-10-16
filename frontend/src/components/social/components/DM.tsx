import { Messages } from '@/components/messages'
import { useMessages } from '@/hooks/queries/useMessages'
import { useAppStore } from '@/stores/appStore'
import { ChevronLeft as LeftIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import {
	MESSAGES_LIMIT,
	usePreviousMessages,
} from '../hooks/usePreviousMessages'
import { LoadingIcon } from '@/pages/home/components/LoadingIcon'
import { scrollToMessage } from '@/lib/utils'
import { useSocial } from '@/context/SocialContext'
import { X as CloseIcon } from 'lucide-react'

type Props = {
	widget?: {
		close: () => void
	}
}

export function DM(props: Props) {
	const clearDM = useAppStore().clearDM
	const setDM = useAppStore().setDM
	const dmUnread = useAppStore().dmUnread
	const dmUser = useSocial().state.dm!
	const socialActions = useSocial().actions
	const { data: initialMessages, isLoading } = useMessages(dmUser.id)
	const messages = useAppStore().dm[dmUser.id] ?? []
	const { ref: messagesStartRef, inView } = useInView()
	const { loading: isPrevMessagesLoading, fetchMessages } = usePreviousMessages(
		dmUser.id
	)

	const hasMessages = initialMessages?.length
	const startID = hasMessages ? initialMessages[0].id : ''
	const endID = hasMessages
		? initialMessages[initialMessages.length - 1].id
		: ''
	const startIdx = messages.findIndex((msg) => msg.id === startID)
	const endIdx = messages.findIndex((msg) => msg.id === endID)

	useEffect(() => {
		if (initialMessages) {
			setDM(dmUser.id, initialMessages)
		}
		return function () {
			clearDM(dmUser.id)
		}
	}, [dmUser.id, initialMessages])

	useEffect(() => {
		if (inView && !isPrevMessagesLoading && messages.length >= MESSAGES_LIMIT) {
			const oldMessage = messages[0]
			fetchMessages(oldMessage.createdAt).then((messages) => {
				if (messages) {
					setDM(dmUser.id, messages)
					// maintain scroll position when old messages are added
					setTimeout(() => {
						scrollToMessage(oldMessage.id, false)
					}, 0)
				}
			})
		}
	}, [inView])

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b border-border flex gap-2 items-center">
				<button
					className="focus:ring-0"
					onClick={() => {
						socialActions.setDM(null)
					}}
				>
					<LeftIcon size={22} className="text-muted" />
				</button>
				<div className="relative">
					<img
						className="w-8 h-8 rounded-full mr-1"
						src={dmUser.avatar}
						referrerPolicy="no-referrer"
					/>
					{dmUnread[dmUser.id] && (
						<span className="w-[10px] h-[10px] rounded-full rounded-full block bg-danger absolute right-[2px] top-0" />
					)}
				</div>
				<p className="ellipsis">{dmUser.username}</p>
				{props.widget && (
					<button className="ml-auto focus:ring-0" onClick={props.widget.close}>
						<CloseIcon className="text-muted" size={20} />
					</button>
				)}
			</div>

			{isLoading && (
				<div className="flex items-center justify-center flex-1">
					<LoadingIcon className="text-brand/20 fill-brand w-6 h-6" />
				</div>
			)}

			{!isLoading && (
				<Messages
					pm={null}
					setPM={() => {}}
					messages={messages.slice(endIdx === -1 ? 0 : endIdx + 1)}
					room={null}
					dm={dmUser}
					initialMessages={
						startIdx === -1 || endIdx === -1
							? []
							: messages.slice(startIdx, endIdx + 1)
					}
					prevMsg={{
						isLoading: isPrevMessagesLoading,
						ref: messagesStartRef,
						messages: startIdx === -1 ? [] : messages.slice(0, startIdx),
					}}
				/>
			)}
		</div>
	)
}
