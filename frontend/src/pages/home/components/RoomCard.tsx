import { RoomRes } from '@/types'
import { useAppStore } from '@/stores/appStore'
import * as Popover from '@radix-ui/react-popover'
import {
	Info as InfoIcon,
	SquarePen as PencilIcon,
	Ban as BanIcon,
	Users as UsersIcon,
} from 'lucide-react'
import { Profile } from '@/components/Profile'
import { useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Tooltip } from '@/components/Tooltip'

type Props = {
	room: RoomRes
}

export function RoomCard(props: Props) {
	const user = useAppStore().user
	const setPopup = useAppStore().setPopup
	const setUpdateRoom = useAppStore().setCreateOrUpdateRoom
	const { room } = props
	const [open, setOpen] = useState<Record<string, boolean>>({})
	const isRoomFull = room.participants.length >= room.maxParticipants

	const size: Record<number, string> = {
		1: '100px',
		2: '90px',
		3: '70px',
		4: '60px',
	}
	const sizeDecider =
		room.maxParticipants > 10 ? room.participants.length : room.maxParticipants
	const participantSize = sizeDecider >= 5 ? '50px' : size[sizeDecider]

	function joinRoom(roomID: number) {
		if (!user) {
			setPopup('login', true)
			return
		}
		window.open(`${window.location.origin}/room/${roomID}`)
	}

	return (
		<div className="p-4 border border-border rounded-md flex flex-col">
			<div className="flex items-center justify-between">
				<Tooltip title={room.topic}>
					<p className="text-lg font-semibold mb-1 ellipsis pr-2">
						{room.topic}
					</p>
				</Tooltip>
				<div className="ml-auto flex gap-2.5 items-center">
					{room.participants.length > 10 && (
						<Tooltip
							title={`Room occupied by ${room.participants.length} people`}
						>
							<UsersIcon size={18} className="text-muted" />
						</Tooltip>
					)}
					<Popover.Root>
						<Popover.Trigger className="rounded-lg">
							<InfoIcon size={18} className="text-muted" />
						</Popover.Trigger>
						<Popover.Anchor />
						<Popover.Portal>
							<Popover.Content
								side="bottom"
								align="end"
								sideOffset={12}
								className="focus:outline-none rounded-lg p-6 shadow-md flex flex-col gap-2 border border-border min-w-[150px] bg-bg"
							>
								<div className="flex flex-col items-center justify-center gap-3 relative">
									<p className="text-muted">Host</p>
									<img
										src={room.settings.host.avatar}
										className="w-12 h-12 rounded-full"
									/>
									<div className="text-center">
										<p className="font-semibold pb-1">
											{room.settings.host.username}
										</p>
										<p className="text-muted text-sm">
											{formatDate(room.createdAt)}
										</p>
									</div>
								</div>
								{user?.id === room.settings.host.id && (
									<button
										className="absolute top-4 right-4 p-[2px] rounded-lg"
										onClick={() => {
											setUpdateRoom(true, room)
										}}
									>
										<span>
											<PencilIcon className="text-muted" size={18} />
										</span>
									</button>
								)}
							</Popover.Content>
						</Popover.Portal>
					</Popover.Root>
				</div>
			</div>

			<p className="text-muted">{room.languages.join(' + ')}</p>

			<div
				className="my-6 grid gap-4 flex-1 empty:min-h-[60px]"
				style={{
					gridTemplateColumns: `repeat(auto-fill, minmax(${participantSize}, 1fr))`,
				}}
			>
				{room.participants.map((p) => {
					return (
						<Profile
							key={p.sid}
							user={p}
							classNames="aspect-square max-w-[100px]"
							open={open[p.sid]}
							setOpen={(open) => {
								setOpen((prev) => ({
									...prev,
									[p.sid]: open,
								}))
							}}
						/>
					)
				})}
				{room.maxParticipants <= 10 &&
					Array.from({
						length:
							Math.min(room.maxParticipants, 10) - room.participants.length,
					}).map((_, i) => {
						return (
							<div
								key={i}
								className="rounded-full border border-border border-dashed aspect-square max-w-[100px]"
							/>
						)
					})}
			</div>

			<button
				disabled={isRoomFull}
				className={cn(
					'flex items-center gap-2 border border-border px-4 py-1 rounded-md focus:ring-brand/40 focus:ring-offset-2 focus:ring-offset-bg self-center mt-auto',
					{
						'border border-border bg-transparent text-muted border-dashed':
							isRoomFull,
					}
				)}
				onClick={() => {
					joinRoom(room.id)
				}}
			>
				{!isRoomFull ? (
					<span>Join room</span>
				) : (
					<>
						<BanIcon size={16} className="text-muted" />
						<span>Room is full</span>
					</>
				)}
			</button>
		</div>
	)
}
