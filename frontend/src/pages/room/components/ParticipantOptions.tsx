import {
	Ellipsis as OptionsIcon,
	Mail as MsgIcon,
	Crown as HostIcon,
	Ghost as CoHostIcon,
	Ban as KickIcon,
	MessageSquareOff as ClearChatIcon,
	Volume2 as VolumeOnIcon,
	VolumeX as VolumeOffIcon,
	Heart as HeartIcon,
	HeartOff as HeartBrokeIcon,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { RoomRes, User } from '@/types'
import { useAppStore } from '@/stores/appStore'
import { ws } from '@/lib/ws'
import { KickParticipant } from './KickParticipant'
import { useState } from 'react'
import { Slider } from '@/components/Slider'
import { useVolume } from '@/hooks/useVolume'
import { useProfile } from '@/hooks/queries/useProfile'
import { useFollow } from '@/hooks/mutations/useFollow'
import { queryClient } from '@/lib/utils'
import { LoadingIcon } from '@/pages/home/components/LoadingIcon'

type Props = {
	participant: User
	room: RoomRes
	setPM: (pm: User | null) => void
	sid: string
	open: boolean
	setOpen: (open: boolean) => void
}

export function ParticipantOptions(props: Props) {
	const { settings } = props.room

	const user = useAppStore().user
	const setRoomTab = useAppStore().setRoomTab

	const [kickOpen, setKickOpen] = useState(false)
	const [participant, setParticipant] = useState<User | null>(null)

	const isMe = user?.id === props.participant.id
	const isHost = settings.host.id === user?.id
	const isCoHost = settings.coHosts?.includes(user?.id as unknown as number)
	const isParticipantCoHost = settings.coHosts?.includes(props.participant.id)
	const isParticipantHost = props.participant.id === settings.host.id
	const hasPermissions = (isHost || isCoHost) && !isParticipantHost

	const { data: profile } = useProfile(
		props.participant.id,
		props.open === true
	)
	const { mutateAsync: followMutate, isLoading } = useFollow()

	const volume = useAppStore().roomStreams[props.sid]?.volume ?? 100
	const setVolume = useAppStore().setVolume
	useVolume(props.sid, volume)

	async function follow() {
		if (!profile || !user) {
			return
		}
		await followMutate({
			isFollowing: profile.isFollowing,
			followeeID: props.participant.id,
		})
		queryClient.invalidateQueries({
			queryKey: ['profile', props.participant.id],
		})
	}

	return (
		<>
			<Popover.Root open={props.open} onOpenChange={props.setOpen}>
				<Popover.Trigger asChild>
					<button className="p-[2px] bg-brand/20 text-brand-fg group-hover:bg-brand absolute right-0 top-0 rounded-bl-md">
						<OptionsIcon size={14} />
					</button>
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Content
						className="min-w-[100px] rounded-lg p-2 shadow-md bg-bg flex flex-col gap-2 border border-border focus:outline-none"
						side="top"
						sideOffset={10}
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						{!isMe && (
							<>
								<button
									className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
									onClick={() => {
										setRoomTab('messages')
										props.setPM(props.participant)
										setTimeout(() => {
											const el = document.getElementById('messages-textarea')
											if (el) {
												el.focus()
											}
										}, 0)
									}}
								>
									<MsgIcon size={18} className="text-muted" />
									<p>PM</p>
								</button>
								<button
									disabled={isLoading}
									className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
									onClick={follow}
								>
									{profile?.isFollowing && !isLoading ? (
										<HeartBrokeIcon size={18} className="text-muted" />
									) : (
										<HeartIcon size={18} className="text-muted" />
									)}
									{isLoading && (
										<LoadingIcon className="text-brand/20 fill-brand w-4 h-4" />
									)}
									<p>{profile?.isFollowing ? 'Unfollow' : 'Follow'}</p>
								</button>
							</>
						)}
						{isHost && !isMe && (
							<button
								className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
								onClick={() => {
									ws.assignRole(
										isParticipantCoHost ? 'guest' : 'coHost',
										props.participant.id
									)
									props.setOpen(false)
								}}
							>
								<CoHostIcon size={18} className="text-muted" />
								<p>{isParticipantCoHost ? 'Unset' : 'Set'} Co-Host</p>
							</button>
						)}
						{isHost && !isMe && (
							<button
								className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
								onClick={() => {
									ws.transferRoom(props.participant.id)
									props.setOpen(false)
								}}
							>
								<HostIcon size={18} className="text-muted" />
								<p>Transfer Room</p>
							</button>
						)}
						{hasPermissions && !isMe && (
							<button
								className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
								onClick={() => {
									setParticipant(props.participant)
									setKickOpen(true)
								}}
							>
								<KickIcon size={18} className="text-muted" />
								<p>Kick</p>
							</button>
						)}
						{hasPermissions && !isMe && (
							<button
								className="flex gap-3 items-center px-2 py-1 rounded-md focus:ring-0 focus:bg-accent hover:bg-accent"
								onClick={() => {
									ws.clearChat(props.participant.id)
									props.setOpen(false)
								}}
							>
								<ClearChatIcon size={18} className="text-muted" />
								<p>Clear Chat</p>
							</button>
						)}
						<div className="px-2 text-center mt-1">
							<div className="pb-1 separator">
								<p>Volume</p>
							</div>
							<div className="flex gap-2 items-center">
								<button
									className="focus:ring-0"
									onClick={() => {
										setVolume(props.sid, volume === 0 ? 100 : 0)
									}}
								>
									{volume === 0 ? (
										<VolumeOffIcon size={22} className="text-muted" />
									) : (
										<VolumeOnIcon size={22} className="text-muted" />
									)}
								</button>
								<Slider
									step={1}
									min={0}
									max={100}
									setValue={(volume) => setVolume(props.sid, volume)}
									value={volume}
								/>
							</div>
						</div>
					</Popover.Content>
				</Popover.Portal>
			</Popover.Root>

			{kickOpen && (
				<KickParticipant
					open={kickOpen}
					setOpen={setKickOpen}
					participant={participant}
				/>
			)}
		</>
	)
}
