import { APIError, getGoogleOAuthURL } from '@/lib/utils'
import { User } from '@/types'
import { Link } from 'react-router-dom'
import {
	DoorOpen as DoorOpenIcon,
	DoorClosed as BanIcon,
	BatteryFull as FullIcon,
	TabletSmartphone as RoomIcon,
	UserX as UserIcon,
} from 'lucide-react'
import { useEffect } from 'react'
import { ws } from '@/lib/ws'
import { format } from 'date-fns'

type Props = {
	error: APIError | undefined
	user: User | null | undefined
	isKicked: {
		expiredAt: string
	} | null
	joinedAnotherRoom: boolean
	leftRoom: boolean
}

export function RoomError(props: Props) {
	const { error, isKicked, user, joinedAnotherRoom } = props

	useEffect(() => {
		ws.close()
	}, [])

	if (!user) {
		return <Error status={401} />
	}

	if (error?.status === 400) {
		return <Error status={error.status} />
	}

	if (error?.status === 404) {
		return <Error status={error.status} />
	}

	if (props.leftRoom) {
		return <Error status={418} />
	}

	if (error?.status === 403 || isKicked) {
		const errors = error?.errors ?? {}
		return <Kicked expiredAt={errors.expiredAt ?? isKicked?.expiredAt ?? ''} />
	}

	if (joinedAnotherRoom) {
		return <Error status={429} />
	}

	return null
}

export function Error(props: { status: number }) {
	const contentMap: Record<number, Record<string, any>> = {
		404: {
			title: 'Room not found',
			desc: "The room you're looking for doesn't seem to exist",
			icon: <DoorOpenIcon className="stroke-pink-500 mb-2 h-12 w-12" />,
		},
		401: {
			title: 'Log in to join the room',
			desc: "You'll be redirected to google to login",
			icon: <UserIcon className="stroke-danger mb-2 h-12 w-12" />,
		},
		400: {
			title: 'Room is full',
			desc: 'All the spots are occupied by other participants',
			icon: <FullIcon className="stroke-yellow-500 mb-2 h-12 w-12" />,
		},
		429: {
			title: 'Room disconnected',
			desc: "You've joined a room in another tab.",
			icon: <RoomIcon className="stroke-orange-500 mb-2 h-12 w-12" />,
		},
		418: {
			// teapot :)
			title: 'Left Room',
			desc: 'You have left the room. You can rejoin at any time.',
			icon: <RoomIcon className="stroke-purple-500 mb-2 h-12 w-12" />,
		},
	}

	const content = contentMap[props.status]

	return (
		<main className="h-full w-full grid place-items-center">
			<div className="max-w-[600px] grid place-items-center text-center px-4">
				{content.icon}
				<h1 className="text-4xl font-bold mb-3">{content.title}</h1>
				<p className="text-muted mb-5">{content.desc}</p>

				{props.status === 401 && (
					<Link
						to={getGoogleOAuthURL()}
						className="bg-bg-2 border border-border px-4 py-2 rounded-md flex gap-2 focus:ring-border focus:ring-1 focus:ring-offset-2 focus:ring-offset-bg"
					>
						Login
					</Link>
				)}

				{props.status === 418 && (
					<button
						onClick={() => window.location.reload()}
						className="bg-brand text-brand-fg px-4 py-2 rounded-md focus:ring-offset-2 focus:ring-offset-bg"
					>
						Rejoin room
					</button>
				)}
			</div>
		</main>
	)
}

export function Kicked(props: { expiredAt: string }) {
	const rejoinAt = format(props.expiredAt, 'dd-MM-yyyy HH:mm:ss a')

	return (
		<main className="h-full w-full grid place-items-center">
			<div className="max-w-[600px] grid place-items-center text-center px-4">
				<BanIcon className="stroke-danger mb-2 h-12 w-12" />
				<h1 className="text-4xl font-bold mb-3">You've been kicked</h1>
				<p className="text-muted mb-3">
					You got removed from the room. You can rejoin at:
				</p>
				<p className="bg-bg-2 px-4 py-2 rounded-md border border-border">
					{rejoinAt}
				</p>
			</div>
		</main>
	)
}
