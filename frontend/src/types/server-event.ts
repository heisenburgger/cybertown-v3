import { Message, RoomRole, User } from '@/types'
import {
	PeerICECandidateEvent,
	PeerAnswerEvent,
	PeerOfferEvent,
	PeerStreamsEvent,
} from './peer'

// ServerEvent comprises of 'BroadcastEvent' and 'SFUEvent'
// BroadcastEvent - events which will be sent to more than one people
// PeerEvent      - events related to webrtc peer
export type ServerEvent =
	| JoinedRoomBroadcastEvent
	| LeftRoomBroadcastEvent
	| RoomsDeletedBroadcastEvent
	| NewRoomBroadcastEvent
	| UpdateRoomBroadcastEvent
	| NewMsgBroadcastEvent
	| EditMsgBroadcastEvent
	| DeleteMsgBroadcastEvent
	| ReactionToMsgBroadcastEvent
	| ClearChatBroadcastEvent
	| AssignRoleBroadcastEvent
	| UpdateWelcomeMsgBroadcastEvent
	| SetStatusBroadcastEvent
	| KickParticipantBroadcastEvent
	| ErrorBroadcastEvent
	| PeerMuteBroadcastEvent
	| PeerICECandidateEvent
	| PeerAnswerEvent
	| PeerOfferEvent
	| PeerStreamsEvent

export type JoinedRoomBroadcastEvent = {
	name: 'JOINED_ROOM_BROADCAST'
	data: {
		roomID: number
		user: User
		sid: string
		key: string
	}
}

export type LeftRoomBroadcastEvent = {
	name: 'LEFT_ROOM_BROADCAST'
	data: {
		roomID: number
		user: User
	}
}

export type RoomsDeletedBroadcastEvent = {
	name: 'ROOMS_DELETED_BROADCAST'
	data: {
		roomIDs: number[]
	}
}

export type NewRoomBroadcastEvent = {
	name: 'NEW_ROOM_BROADCAST'
	data: {
		roomID: number
	}
}

export type UpdateRoomBroadcastEvent = {
	name: 'UPDATE_ROOM_BROADCAST'
	data: ReactionToMessage
}

export type NewMsgBroadcastEvent = {
	name: 'NEW_MESSAGE_BROADCAST'
	data: Message
}

export type EditMsgBroadcastEvent = {
	name: 'EDIT_MESSAGE_BROADCAST'
	data: EditMessage
}

export type DeleteMsgBroadcastEvent = {
	name: 'DELETE_MESSAGE_BROADCAST'
	data: DeleteMessage
}

export type ReactionToMsgBroadcastEvent = {
	name: 'REACTION_TO_MESSAGE_BROADCAST'
	data: ReactionToMessage
}

export type ClearChatBroadcastEvent = {
	name: 'CLEAR_CHAT_BROADCAST'
	data: RoomAction
}

export type AssignRoleBroadcastEvent = {
	name: 'ASSIGN_ROLE_BROADCAST'
	data: RoomAction & { role: RoomRole }
}

export type UpdateWelcomeMsgBroadcastEvent = {
	name: 'UPDATE_WELCOME_MESSAGE_BROADCAST'
	data: {
		welcomeMessage: string
		roomID: number
	}
}

export type SetStatusBroadcastEvent = {
	name: 'SET_STATUS_BROADCAST'
	data: {
		status: string
		roomID: number
	}
}

export type KickParticipantBroadcastEvent = {
	name: 'KICK_PARTICIPANT_BROADCAST'
	data: {
		participant: User
		roomID: number
		expiredAt: string
	}
}

export type ErrorBroadcastEvent = {
	name: 'ERROR_BROADCAST'
	data: {
		content: string
		roomID: number
		title: string
	}
}

export type PeerMuteBroadcastEvent = {
	name: 'PEER_MUTE_BROADCAST'
	data: {
		participantID: string
		roomID: number
		mute: boolean
	}
}

export type EditMessage = {
	id: string
	content: string
	from: User
	roomID?: number
	participant?: User
}

export type DeleteMessage = {
	id: string
	from: User
	roomID?: number
	participant?: User
}

export type ReactionToMessage = {
	id: string
	from: User
	reaction: string
	roomID?: number
	participant: User
}

type RoomAction = {
	roomID: number
	by: User
	participant: User
}
