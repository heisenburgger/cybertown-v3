import { useJoinRoom } from '@/hooks/queries/useJoinRoom'
import { ws } from '@/lib/ws'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Onboarding } from '@/pages/room/components/Onboarding'
import { RoomError } from '@/pages/room/components/RoomError'
import { Room } from '@/pages/room/components/Room'
import { useAppStore } from '@/stores/appStore'
import { APIError } from '@/lib/utils'
import { bc } from '@/lib/bc'
import { LoadingIcon } from '../home/components/LoadingIcon'

export function RoomPage() {
	const [isOnboarding, setIsOnBoarding] = useState(true)
	const roomID = Number(useParams().roomID)
	const user = useAppStore().user
	const isKicked = useAppStore().isKicked
	const joinedAnotherRoom = useAppStore().joinedAnotherRoom
	const leftRoom = useAppStore().leftRoom
	const socketConnected = useAppStore().socketConnected
	const { isLoading, error } = useJoinRoom(
		roomID!,
		user !== null && user !== undefined
	)

	useEffect(() => {
		if (!isOnboarding && user) {
			ws.joinRoom(roomID!)
		}
	}, [isOnboarding, user])

	useEffect(() => {
		bc.sendMessage({ name: 'VISITED_ROOM_PAGE' })
	}, [])

	if (isLoading || user === undefined || !socketConnected) {
		return (
			<div className="h-screen flex items-center justify-center">
				<LoadingIcon className="text-brand/20 fill-brand w-8 h-8" />
			</div>
		)
	}

	if (user === null || error || isKicked || joinedAnotherRoom || leftRoom) {
		return (
			<RoomError
				error={error as APIError}
				user={user}
				isKicked={isKicked}
				joinedAnotherRoom={joinedAnotherRoom}
				leftRoom={leftRoom}
			/>
		)
	}

	if (isOnboarding && user) {
		return <Onboarding user={user} setIsOnboarding={setIsOnBoarding} />
	}

	return <Room roomID={roomID!} />
}
