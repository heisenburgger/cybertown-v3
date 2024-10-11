import { RoomRole } from '.'
import {
	PeerICECandidateEvent,
	PeerOfferEvent,
	PeerAnswerEvent,
	PeerMuteEvent,
} from './peer'

export type ClientEvent =
	| JoinRoomEvent
	| NewMsgEvent
	| EditMsgEvent
	| DeleteMsgEvent
	| ReactionToMsgEvent
	| ClearChatEvent
	| AssignRoleEvent
	| UpdateWelcomeMsgEvent
	| SetStatusEvent
	| KickPartcipantEvent
	| PeerICECandidateEvent
	| PeerOfferEvent
	| PeerAnswerEvent
	| PeerMuteEvent

export type JoinRoomEvent = {
	name: 'JOIN_ROOM'
	data: {
		roomID: number
		key: string
	}
}

export type NewMsgEvent = {
	name: 'NEW_MESSAGE'
	data: {
		content: string
		roomID?: number
		replyTo?: string
		participantID?: number
	}
}

export type EditMsgEvent = {
	name: 'EDIT_MESSAGE'
	data: {
		id: string
		content: string
		roomID?: number
		participantID?: number
	}
}

export type DeleteMsgEvent = {
	name: 'DELETE_MESSAGE'
	data: {
		id: string
		roomID?: number
		participantID?: number
	}
}

export type ReactionToMsgEvent = {
	name: 'REACTION_TO_MESSAGE'
	data: {
		id: string
		reaction: string
		roomID?: number
		participantID?: number
	}
}

export type ClearChatEvent = {
	name: 'CLEAR_CHAT'
	data: {
		participantID: number
		roomID: number
	}
}

export type AssignRoleEvent = {
	name: 'ASSIGN_ROLE'
	data: {
		role: RoomRole
		participantID: number
		roomID: number
	}
}

export type UpdateWelcomeMsgEvent = {
	name: 'UPDATE_WELCOME_MESSAGE'
	data: {
		welcomeMessage: string
		roomID: number
	}
}

export type SetStatusEvent = {
	name: 'SET_STATUS'
	data: {
		status: string
		roomID: number
	}
}

export type KickPartcipantEvent = {
	name: 'KICK_PARTICIPANT'
	data: {
		participantID: number
		roomID: number
		duration: string
		clearChat: boolean
	}
}
