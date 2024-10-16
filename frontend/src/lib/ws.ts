import { config } from '@/config'
import { ClientEvent } from '@/types/client-event'
import { ServerEvent } from '@/types/server-event'
import { generateRandomID, queryClient, removeAudioStreams } from './utils'
import { useAppStore } from '@/stores/appStore'
import { RoomRole } from '@/types'
import { peer } from '@/lib/peer'

class WS {
	private socket: WebSocket | null = null
	private static instance: WS
	private isClosedByClient = false

	roomID: number | null = null
	joinRoomKey: string | null = null

	// retries backoff: https://encore.dev/blog/retries
	private maxReconnectDelay = 30
	private baseReconnectDelay = 0.5
	private maxReconnectAttempt = 100
	private reconnectAttempts = 0

	static getInstance(): WS {
		if (!WS.instance) {
			WS.instance = new WS()
		}
		return WS.instance
	}

	constructor() {
		this.establishSocketConn()
	}

	establishSocketConn() {
		this.socket = null
		const socket = new WebSocket(config.wsURL)

		socket.onclose = (e: CloseEvent) => {
			console.error('socket connection closed', e.code)
			useAppStore.getState().setSocketConnected(false)
			this.cleanup()
			if (!this.isClosedByClient) {
				this.reconnect()
			}
		}

		socket.onopen = () => {
			useAppStore.getState().setSocketConnected(true)
			this.reconnectAttempts = 0

			// if the socket established after reconnection
			// rejoin room
			if (this.roomID) {
				const roomID = this.roomID
				this.roomID = null
				ws.joinRoom(roomID)
				queryClient.invalidateQueries({
					queryKey: [
						['room', roomID],
						['dms', roomID],
					],
				})
			}
		}

		socket.onmessage = (e: MessageEvent) => {
			try {
				const event: ServerEvent = JSON.parse(e.data)
				switch (event.name) {
					case 'JOINED_ROOM_BROADCAST':
					case 'LEFT_ROOM_BROADCAST':
					case 'ROOMS_DELETED_BROADCAST':
					case 'NEW_ROOM_BROADCAST':
					case 'UPDATE_ROOM_BROADCAST':
					case 'ASSIGN_ROLE_BROADCAST':
					case 'UPDATE_WELCOME_MESSAGE_BROADCAST':
					case 'SET_STATUS_BROADCAST':
						if (
							event.name === 'JOINED_ROOM_BROADCAST' &&
							event.data.key === this.joinRoomKey
						) {
							useAppStore.getState().joinedRoom(event)
						}
						// react-query handles deduplication. sometimes (when user just joined a room)
						// we want to still make an API call and fetch the current state in the server.
						// https://github.com/TanStack/query/discussions/608
						setTimeout(() => {
							queryClient.invalidateQueries({
								queryKey: ['rooms'],
							})
						}, 100)
						break
					case 'NEW_MESSAGE_BROADCAST':
						useAppStore.getState().addMsg(event)
						break
					case 'EDIT_MESSAGE_BROADCAST':
						useAppStore.getState().editMsg(event)
						break
					case 'DELETE_MESSAGE_BROADCAST':
						useAppStore.getState().deleteMsg(event)
						break
					case 'REACTION_TO_MESSAGE_BROADCAST':
						useAppStore.getState().reactionToMsg(event)
						break
					case 'CLEAR_CHAT_BROADCAST':
						if (event.data.roomID !== this.roomID) {
							return
						}
						useAppStore.getState().clearChat(event)
						break
					case 'KICK_PARTICIPANT_BROADCAST':
						if (event.data.roomID !== this.roomID) {
							return
						}
						useAppStore.getState().kickParticipant(event)
						break
					case 'ERROR_BROADCAST':
						if (event.data.roomID !== this.roomID) {
							return
						}
						useAppStore.getState().error(event)
						break
					case 'PEER_MUTE_BROADCAST':
						if (event.data.roomID !== this.roomID) {
							return
						}
						useAppStore.getState().setMute(event)
						break
					case 'PEER_ICE_CANDIDATE':
						if (event.data.roomID !== this.roomID) {
							return
						}
						const candiate = JSON.parse(event.data.candidate)
						peer.pc!.addIceCandidate(candiate)
						break
					case 'PEER_ANSWER':
						if (event.data.roomID !== this.roomID) {
							return
						}

						peer.pc!.setRemoteDescription(JSON.parse(event.data.answer))
						break
					case 'PEER_OFFER':
						if (event.data.roomID !== this.roomID) {
							return
						}
						peer.acceptOffer(event.data.offer)
						break
					case 'PEER_STREAMS':
						if (event.data.roomID !== this.roomID) {
							return
						}
						useAppStore.getState().addToRoomStreams(event.data.streams)
						break
					default:
						console.error('unknown event', event)
				}
			} catch (err) {
				console.error("failed to parse broadcast event 'data' field", err)
			}
		}
		this.socket = socket
	}

	reconnect() {
		if (this.reconnectAttempts > this.maxReconnectAttempt) {
			console.error('reached maximum reconnect attempts')
			return
		}

		const exponentialDelay = this.baseReconnectDelay * this.reconnectAttempts
		const cappedDelay = Math.min(exponentialDelay, this.maxReconnectDelay)
		const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1)
		const delay = cappedDelay + jitter

		setTimeout(() => {
			this.reconnectAttempts++
			this.establishSocketConn()
		}, delay * 1000)
	}

	cleanup() {
		if (peer.pc) {
			peer.pc.close()
			peer.pc = null
		}
		useAppStore.getState().clearRoomStreams()
		removeAudioStreams()
	}

	joinRoom(roomID: number) {
		if (this.roomID) {
			return
		}

		this.roomID = roomID
		this.joinRoomKey = generateRandomID()

		peer.createPeer()
		this.sendClientEvent({
			name: 'JOIN_ROOM',
			data: {
				roomID: roomID,
				key: this.joinRoomKey,
			},
		})
	}

	editMsg(id: string, content: string, participantID?: number, isDM?: boolean) {
		this.sendClientEvent({
			name: 'EDIT_MESSAGE',
			data: {
				id,
				content,
				participantID,
				roomID: isDM ? undefined : this.roomID!,
			},
		})
	}

	deleteMsg(id: string, participantID?: number, isDM?: boolean) {
		this.sendClientEvent({
			name: 'DELETE_MESSAGE',
			data: {
				id,
				participantID,
				roomID: isDM ? undefined : this.roomID!,
			},
		})
	}

	reactionToMsg(
		id: string,
		reaction: string,
		participantID?: number,
		isDM?: boolean
	) {
		this.sendClientEvent({
			name: 'REACTION_TO_MESSAGE',
			data: {
				id,
				reaction,
				participantID,
				roomID: isDM ? undefined : this.roomID!,
			},
		})
	}

	newMessage(
		content: string,
		replyTo?: string,
		participantID?: number,
		isDM?: boolean
	) {
		this.sendClientEvent({
			name: 'NEW_MESSAGE',
			data: {
				content,
				replyTo,
				participantID,
				roomID: isDM ? undefined : this.roomID!,
			},
		})
	}

	clearChat(participantID: number) {
		this.sendClientEvent({
			name: 'CLEAR_CHAT',
			data: {
				roomID: this.roomID!,
				participantID,
			},
		})
	}

	transferRoom(participantID: number) {
		this.sendClientEvent({
			name: 'ASSIGN_ROLE',
			data: {
				roomID: this.roomID!,
				participantID,
				role: 'host',
			},
		})
	}

	assignRole(role: Exclude<RoomRole, 'host'>, participantID: number) {
		this.sendClientEvent({
			name: 'ASSIGN_ROLE',
			data: {
				roomID: this.roomID!,
				participantID,
				role,
			},
		})
	}

	updateWelcomeMsg(welcomeMessage: string) {
		this.sendClientEvent({
			name: 'UPDATE_WELCOME_MESSAGE',
			data: {
				roomID: this.roomID!,
				welcomeMessage,
			},
		})
	}

	setStatus(status: string) {
		this.sendClientEvent({
			name: 'SET_STATUS',
			data: {
				roomID: this.roomID!,
				status,
			},
		})
	}

	kickParticipant(participantID: number, duration: string, clearChat: boolean) {
		this.sendClientEvent({
			name: 'KICK_PARTICIPANT',
			data: {
				participantID,
				roomID: this.roomID!,
				duration,
				clearChat,
			},
		})
	}

	peerICECandidate(candidate: string) {
		this.sendClientEvent({
			name: 'PEER_ICE_CANDIDATE',
			data: {
				candidate,
				roomID: this.roomID!,
			},
		})
	}

	peerOffer(offer: string) {
		this.sendClientEvent({
			name: 'PEER_OFFER',
			data: {
				offer,
				roomID: this.roomID!,
			},
		})
	}

	peerAnswer(answer: string) {
		this.sendClientEvent({
			name: 'PEER_ANSWER',
			data: {
				answer,
				roomID: this.roomID!,
			},
		})
	}

	peerMute(mute: boolean) {
		this.sendClientEvent({
			name: 'PEER_MUTE',
			data: {
				mute,
				roomID: this.roomID!,
			},
		})
	}

	sendClientEvent(event: ClientEvent) {
		this.socket!.send(JSON.stringify(event))
	}

	close() {
		this.isClosedByClient = true
		this.socket!.close()
	}
}

export const ws = WS.getInstance()
