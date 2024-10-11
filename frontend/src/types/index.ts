export type User = {
	id: number
	username: string
	avatar: string
}

export type Profile = {
	bio: string
	isMe: boolean
	isFollowing: boolean
	isFriend: boolean
	friendsCount: number
	followingCount: number
	followersCount: number
} & User

export type Room = {
	id: number
	createdAt: string
	settings: RoomSettings
} & CreateRoom

export type RoomSettings = {
	host: User
	coHosts?: number[]
	welcomeMessage?: string
}

export type Message = {
	id: string
	content: string
	createdAt: string
	from: User
	roomID: number
	reactions: Record<string, Record<number, User>>
	isEdited?: boolean
	isDeleted?: boolean
	replyTo?: string
	participant?: User
}

export type CreateRoom = {
	topic: string
	maxParticipants: number
	languages: string[]
}

export type RoomRes = Room & {
	participants: (User & { sid: string; status: string })[]
}

export type RoomRole = 'host' | 'coHost' | 'guest'

export type RelationRes = { isFriend: boolean } & User

export type DMsRes = {
	dmID: number
	user: User
	lastMessage: {
		isDeleted: boolean
		content: string
		createdAt: string
		from: User
		isUnread: boolean
	} | null
}
