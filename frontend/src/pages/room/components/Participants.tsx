import { RoomRes, User } from '@/types'
import { ParticipantOptions } from './ParticipantOptions'
import { useAppStore } from '@/stores/appStore'
import { cn } from '@/lib/utils'
import { MicOff as MicOffIcon } from 'lucide-react'
import { Waveform } from './Waveform'
import { useState } from 'react'

type Props = {
	room: RoomRes
	setPM: (pm: User | null) => void
}

export function Participants(props: Props) {
	const { room } = props
	const sid = useAppStore().sid
	const streams = useAppStore().roomStreams
	const [open, setOpen] = useState<Record<string, boolean>>({})

	return (
		<div className="flex gap-3 overflow-x-auto overflow-y-hidden scroller py-2 px-3">
			{room.participants.map((p, i) => {
				const isHost = room.settings.host.id === p.id
				const isCoHost = room.settings.coHosts?.includes(p.id)
				const stream = streams[p.sid] ?? { speaking: false, mute: true }
				return (
					<div
						key={p.sid}
						className={cn(
							'shadow-sm text-center text-sm relative participant min-h-[96px]',
							{
								'ml-auto': i === 0,
								'mr-auto': room.participants.length - 1 === i,
							}
						)}
					>
						<div className="relative group participant h-full">
							<img
								src={p.avatar}
								key={p.sid}
								className="max-h-[96px] max-w-[96px] min-w-[96px] min-w-[96px]"
							/>
							{(isHost || isCoHost || p.status !== 'None') && (
								<div className="px-[4px] py-[0.5px] bg-brand/90 text-brand-fg group-hover:bg-brand absolute bottom-0 left-0 rounded-tr-md text-[11px]">
									{p.status !== 'None' && (
										<>
											<p>{p.status}</p>
											{(isHost || isCoHost) && <hr />}
										</>
									)}
									{isHost && <p>Host</p>}
									{isCoHost && <p>Co-Host</p>}
								</div>
							)}
							<div className="absolute text-white invisible group-hover:visible inset-0 flex items-center justify-center">
								<div className="max-w-full max-h-full overflow-hidden px-1">
									<p className="text-center break-words line-clamp-2">
										{p.username}
									</p>
								</div>
							</div>
							<div className="absolute bottom-[2px] right-1">
								{!stream.mute && stream.speaking && <Waveform />}
								{stream.mute && (
									<div className="bg-black/35 p-1 rounded-full">
										<MicOffIcon
											size={14}
											strokeWidth={1.5}
											className="stroke-white"
										/>
									</div>
								)}
							</div>
						</div>
						{sid !== p.sid && (
							<ParticipantOptions
								participant={p}
								room={room}
								setPM={props.setPM}
								sid={p.sid}
								open={open[p.sid]}
								setOpen={(open) => {
									setOpen((prev) => ({
										...prev,
										[p.sid]: open,
									}))
								}}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
