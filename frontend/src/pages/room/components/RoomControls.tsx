import { Tooltip } from '@/components/Tooltip'
import { peer } from '@/lib/peer'
import { ws } from '@/lib/ws'
import { useAppStore } from '@/stores/appStore'
import {
	Mic as MicIcon,
	MicOff as MicOffIcon,
	LogOut as LeaveRoom,
} from 'lucide-react'
import { useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

export function RoomControls() {
	const [mic, setMic] = useState(false)
	const hasStream = useRef(false)
	const setToast = useAppStore().setToast
	const setLeftRoom = useAppStore().setLeftRoom
	const [open, setOpen] = useState(false)

	async function handleMic() {
		if (!hasStream.current) {
			try {
				await peer.speak()
				setMic(true)
				hasStream.current = true
				ws.peerMute(false)
			} catch (err) {
				console.error('failed to get audio stream', err)
				setToast(true, {
					type: 'error',
					title: 'Microphone',
					description: 'Failed to get access microphone',
				})
			} finally {
				return
			}
		}

		if (peer.track) {
			peer.track.enabled = !mic
			ws.peerMute(mic)
			setMic((prev) => !prev)
		}
	}

	return (
		<div className="flex justify-center">
			<div className="flex justify-center items-center gap-1 py-[2px] min-w-[140px] bg-bg-2 border border-border rounded-b-md border-t-0">
				<Tooltip title={`Turn ${mic ? 'off' : 'on'} microphone`}>
					<button className="focus:ring-0 p-2" onClick={handleMic}>
						{mic ? (
							<MicIcon
								className="text-muted stroke-brand"
								strokeWidth={1.5}
								size={20}
							/>
						) : (
							<MicOffIcon className="text-muted" strokeWidth={1.5} size={20} />
						)}
					</button>
				</Tooltip>
				<Popover.Root open={open} onOpenChange={setOpen}>
					<Popover.Trigger asChild>
						<Tooltip title="Leave room">
							<button className="focus:ring-0 p-2" onClick={() => {}}>
								<LeaveRoom className="text-muted" strokeWidth={1.5} size={20} />
							</button>
						</Tooltip>
					</Popover.Trigger>
					<Popover.Anchor />
					<Popover.Content
						sideOffset={12}
						side="bottom"
						align="start"
						className="focus:outline-none rounded-md p-2 shadow-md bg-bg flex flex-col gap-2 border border-border"
					>
						<p className="max-w-[240px] mb-[1px]">
							Are you sure you want to leave the room?
						</p>
						<div className="flex items-center gap-2">
							<button
								className="ml-auto bg-muted/20 px-4 py-[1px] rounded-md"
								onClick={() => setOpen(false)}
							>
								No
							</button>
							<button
								className="bg-brand text-brand-fg px-4 py-[1px] rounded-md focus:ring-offset-2 focus:ring-offset-bg"
								onClick={() => {
									setLeftRoom(true)
								}}
							>
								Yes
							</button>
						</div>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>
	)
}
