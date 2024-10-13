export type PeerICECandidateEvent = {
	name: 'PEER_ICE_CANDIDATE'
	data: {
		candidate: string
		roomID: number
	}
}

export type PeerOfferEvent = {
	name: 'PEER_OFFER'
	data: {
		offer: string
		roomID: number
	}
}

export type PeerAnswerEvent = {
	name: 'PEER_ANSWER'
	data: {
		answer: string
		roomID: number
	}
}

export type PeerStreamsEvent = {
	name: 'PEER_STREAMS'
	data: {
		roomID: number
		streams: Record<string, string>
	}
}

export type PeerMuteEvent = {
	name: 'PEER_MUTE'
	data: {
		roomID: number
		mute: boolean
	}
}

export type RoomStream = {
	streamID: string | null
	speaking: boolean
	mute: boolean
	volume: number // 1 - 100
}
