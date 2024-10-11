import { useRef, useState } from 'react'
import { Hand as NoMessagesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import { VerticalScrollbar } from '@/components/VerticalScrollbar'
import { Message } from '@/components/messages/message'
import { RoomRes, User } from '@/types'
import React from 'react'
import { Message as TMessage } from '@/types'
import { LoadingIcon } from '@/pages/home/components/LoadingIcon'
import { useScroll } from './hooks/useScroll'
import { useReadMessage } from './hooks/useReadMessage'
import { BottomPanel } from './BottomPanel'
import { useFocus } from './hooks/useFocus'

type Props = {
	pm: User | null
	setPM: (pm: User | null) => void
	room: RoomRes | null
	messages: TMessage[]

	// when this component is used as "dm"
	initialMessages?: TMessage[]
	dm: User | null
	prevMsg: {
		messages: TMessage[]
		isLoading: boolean
		ref: (node: Element | null) => void
	} | null
}

export const Messages = React.forwardRef((props: Props, _ref) => {
	const { initialMessages = [] } = props
	const previousMessages = props.prevMsg?.messages ?? []
	const messages = [...previousMessages, ...initialMessages, ...props.messages]
	const messagesRef = useRef<HTMLDivElement>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const [editMsgID, setEditMsgID] = useState<string | undefined>(undefined)
	const [replyTo, setReplyTo] = useState<string | undefined>(undefined)

	const viewRef = useReadMessage(props.dm?.id, initialMessages, props.messages)
	useScroll(
		props.dm,
		messagesRef,
		messagesEndRef,
		initialMessages,
		props.messages
	)
	useFocus(messagesRef)

	return (
		<div className="flex-1 flex flex-col bg-bg rounded-md overflow-hidden">
			{!messages.length && props.dm && (
				<div className="flex-1 text-muted flex flex-col items-center justify-center gap-3">
					<NoMessagesIcon strokeWidth={1.5} />
					<p className="max-w-[300px] text-center">
						Start a conversation! Messages older than 7 days will be
						automatically deleted
					</p>
				</div>
			)}

			{(messages.length || !props.dm) && (
				<ScrollArea.Root className="overflow-hidden flex-1">
					<ScrollArea.Viewport
						ref={messagesRef}
						className={cn('w-full h-full pt-2', {
							'pb-14': replyTo || props.pm,
							'pb-32': replyTo && props.pm,
						})}
					>
						{props.prevMsg && (
							<div
								ref={props.prevMsg.ref}
								className="min-h-1 flex items-center justify-center"
							>
								{props.prevMsg.isLoading && (
									<LoadingIcon className="mt-2 text-brand/20 fill-brand" />
								)}
							</div>
						)}
						{messages.map((message) => {
							return (
								<Message
									messages={messages}
									key={message.id}
									message={message}
									textareaRef={textareaRef}
									editMsgID={editMsgID}
									setEditMsgID={setEditMsgID}
									setReplyTo={setReplyTo}
									setPM={props.setPM}
									dm={props.dm}
								/>
							)
						})}
						<div className="min-h-1" ref={viewRef} />
						<div ref={messagesEndRef} />
					</ScrollArea.Viewport>
					<VerticalScrollbar />
				</ScrollArea.Root>
			)}

			<BottomPanel
				messages={messages}
				textareaRef={textareaRef}
				editMsgID={editMsgID}
				setEditMsgID={setEditMsgID}
				setReplyTo={setReplyTo}
				setPM={props.setPM}
				dm={props.dm}
				pm={props.pm}
				room={props.room}
				replyTo={replyTo}
				messagesEndRef={messagesEndRef}
			/>
		</div>
	)
})
