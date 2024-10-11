import { RoomRes, User } from '@/types'
import { Participants } from './Participants'
import { useAppStore } from '@/stores/appStore'
import { RoomControls } from './RoomControls'

type Props = {
	room: RoomRes | undefined
	isLoading: boolean
	setPM: (pm: User | null) => void
}

export function RoomStagingArea(props: Props) {
	const user = useAppStore().user
	const { room, isLoading, setPM } = props

	return (
		<div className="h-full md:border md:border-border rounded-md bg-bg flex flex-col">
			<RoomControls />
			<div className="flex-1 flex items-center justify-center">
				{room?.settings.welcomeMessage && (
					<p className="text-yellow-500 max-w-[500px] px-4 whitespace-pre-wrap">
						{room.settings.welcomeMessage.replace(
							'{username}',
							user?.username ?? ''
						)}
					</p>
				)}
			</div>
			{!isLoading && room && <Participants room={room} setPM={setPM} />}
		</div>
	)
}
