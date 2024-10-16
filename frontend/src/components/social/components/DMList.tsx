import React, { useState } from 'react'
import { useDMs } from '@/hooks/queries/useDMs'
import { LoadingIcon } from '@/pages/home/components/LoadingIcon'
import { Mail as MessagesIcon } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Profile } from '@/components/Profile'
import { useAppStore } from '@/stores/appStore'
import { useSocial } from '@/context/SocialContext'

export const DMList = React.forwardRef((_props, _ref) => {
	const user = useAppStore().user
	const { data: dms, isLoading } = useDMs(Boolean(user))
	const [open, setOpen] = useState<Record<number, boolean>>({})
	const dmUnread = useAppStore().dmUnread
	const socialActions = useSocial().actions

	if (isLoading) {
		return (
			<div className="flex items-center justify-center flex-1">
				<LoadingIcon className="text-brand/20 fill-brand w-6 h-6" />
			</div>
		)
	}

	if (!isLoading && !dms?.length) {
		return (
			<div className="flex-1 text-muted flex flex-col items-center justify-center gap-3">
				<MessagesIcon strokeWidth={1.5} />
				<p className="max-w-[300px] text-center">
					You haven't messaged with anyone yet. Start a conversation!
				</p>
			</div>
		)
	}

	return (
		<div className="flex-1 px-3 pb-3 focus:outline-none flex flex-col overflow-auto scroller">
			{dms.map((dm) => {
				const latestMsgContent = dmUnread[dm.user.id]
				return (
					<div key={dm.user.id} className="flex gap-3 mt-4">
						<Profile
							user={dm.user}
							classNames="w-8 h-8"
							open={open[dm.user.id]}
							setOpen={(open) => {
								setOpen((prev) => ({
									...prev,
									[dm.user.id]: open,
								}))
							}}
						/>
						<div className="flex items-center justify-between flex-1 overflow-x-hidden">
							<div className="w-full overflow-x-hidden">
								<div className="flex justify-between items-baseline gap-4">
									<p
										role="button"
										className="ellipsis"
										onClick={() => {
											socialActions.setDM(dm.user)
										}}
									>
										{dm.user.username}
									</p>
									{dm.lastMessage && (
										<p className="text-muted text-sm flex-shrink-0">
											{formatDate(dm.lastMessage.createdAt)}
										</p>
									)}
								</div>
								{(dm.lastMessage || typeof latestMsgContent === 'string') && (
									<div className="flex items-center">
										<p
											className={cn('text-muted text-sm ellipsis flex-1', {
												italic: dm.lastMessage?.isDeleted,
											})}
										>
											{dm.lastMessage?.isDeleted
												? 'This message has been deleted'
												: typeof latestMsgContent === 'string'
													? latestMsgContent
													: dm.lastMessage?.content}
										</p>
										{dmUnread[dm.user.id] && (
											<span className="w-2 h-2 rounded-full rounded-full block bg-danger" />
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
})
