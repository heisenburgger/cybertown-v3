import { getDMParticipant, queryClient } from '@/lib/utils'
import { ws } from '@/lib/ws'
import { DMsRes, Room, User } from '@/types'
import {
	ClearChatBroadcastEvent,
	DeleteMsgBroadcastEvent,
	EditMsgBroadcastEvent,
	ErrorBroadcastEvent,
	JoinedRoomBroadcastEvent,
	KickParticipantBroadcastEvent,
	NewMsgBroadcastEvent,
	PeerMuteBroadcastEvent,
	ReactionToMsgBroadcastEvent,
} from '@/types/server-event'
import { Message } from '@/types'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { RoomStream } from '@/types/peer'

type State = {
	socketConnected: boolean
	peerConnected: boolean

	isKicked: {
		expiredAt: string
	} | null
	joinedAnotherRoom: boolean
	leftRoom: boolean
	roomFull: boolean

	dm: Record<string, Message[]>

	/* if the value is "string", then it points to the
	 * recent message received via socket
	 */
	dmUnread: Record<string, boolean | string>

	selectedDM: number | null /* points to the participant id */

	/*
	 undefined -> /me api call is not made yet
	 null      -> /me api call is made but no user
	*/
	user: User | null | undefined

	sid: string | null

	messages: Message[]
	roomTab: string
	unreadCount: number /* room messages unread count */
	scroll: {
		/* messages container scroll position */ percent: number
		hasScrolledDown: boolean
	}
	roomStreams: Record<string, RoomStream>

	popups: {
		login: boolean
		logout: boolean
		theme: boolean /* change color and theme */
		profile: boolean /* change profile */
		bio: boolean /* edit bio */
	}

	toast: {
		open: boolean
		content?: {
			type: 'info' | 'error'
			title: string
			description: string
		}
	}

	createOrUpdateRoom: {
		open: boolean
		room?: Room
	}
}

type Actions = {
	setUser: (user: User | null | undefined) => void
	setPopup: (popup: keyof State['popups'], visibility: boolean) => void
	clearMessages: () => void
	setToast: (open: boolean, content?: State['toast']['content']) => void
	setCreateOrUpdateRoom: (open: boolean, room?: Room) => void
	setJoinedAnotherRoom: (isJoined: boolean) => void
	setRoomTab: (tab: string) => void
	setUnreadCount: (count: number) => void
	addToRoomStreams: (streams: Record<string, string>) => void
	setSpeaking: (streamID: string, speaking: boolean) => void
	setVolume: (pID: string, volume: number) => void
	setLeftRoom: (left: boolean) => void
	setSocketConnected: (status: boolean) => void
	setPeerConnected: (status: boolean) => void
	clearRoomStreams: () => void

	// scroll
	setScrollPercent: (percent: number) => void
	setScrolledDown: (hasScrolledDown: boolean) => void

	// dm
	setDM: (participantID: number, messages: Message[]) => void
	clearDM: (participantID: number) => void
	setDMUnread: (dmUnread: Record<string, boolean>) => void
	setDMReadForParticipant: (participantID: number) => void

	// broadcast events
	joinedRoom: (event: JoinedRoomBroadcastEvent) => void
	addMsg: (event: NewMsgBroadcastEvent) => void
	editMsg: (event: EditMsgBroadcastEvent) => void
	deleteMsg: (event: DeleteMsgBroadcastEvent) => void
	reactionToMsg: (event: ReactionToMsgBroadcastEvent) => void
	clearChat: (event: ClearChatBroadcastEvent) => void
	kickParticipant: (event: KickParticipantBroadcastEvent) => void
	error: (event: ErrorBroadcastEvent) => void
	setMute: (event: PeerMuteBroadcastEvent) => void
}

export const useAppStore = create<State & Actions>()(
	immer((set) => ({
		socketConnected: false,
		peerConnected: false,

		isKicked: null,
		joinedAnotherRoom: false,
		leftRoom: false,
		roomFull: false,

		user: undefined,

		sid: null,

		messages: [],
		roomTab: 'messages',
		unreadCount: 0,

		dm: {},
		dmUnread: {},
		selectedDM: null,
		scroll: {
			percent: 0,
			hasScrolledDown: false,
		},
		roomStreams: {},

		popups: {
			login: false,
			logout: false,
			theme: false,
			bio: false,
			profile: false,
		},

		toast: {
			open: false,
		},

		createOrUpdateRoom: {
			open: false,
		},

		setUser: (user) =>
			set((state) => {
				state.user = user
			}),

		setRoomTab: (tab) =>
			set((state) => {
				state.roomTab = tab
			}),

		setUnreadCount: (count) =>
			set((state) => {
				state.unreadCount = count
			}),

		setScrolledDown: (hasScrolledDown) =>
			set((state) => {
				state.scroll.hasScrolledDown = hasScrolledDown
			}),

		setScrollPercent: (percent) =>
			set((state) => {
				state.scroll.percent = percent
			}),

		setJoinedAnotherRoom: (isJoined) =>
			set((state) => {
				state.joinedAnotherRoom = isJoined
			}),

		clearRoomStreams: () =>
			set((state) => {
				state.roomStreams = {}
			}),

		setLeftRoom: (left) =>
			set((state) => {
				state.leftRoom = left
			}),

		setSocketConnected: (status) =>
			set((state) => {
				state.socketConnected = status
			}),

		setPeerConnected: (status) =>
			set((state) => {
				state.peerConnected = status
			}),

		setPopup: (popup, visibility) =>
			set((state) => {
				state.popups[popup] = visibility
			}),

		clearMessages: () =>
			set((state) => {
				state.messages = []
			}),

		setToast: (open, content) =>
			set((state) => {
				state.toast = { open, content }
			}),

		setDMUnread: (dmUnread) =>
			set((state) => {
				state.dmUnread = dmUnread
			}),

		setDMReadForParticipant: (participantID: number) =>
			set((state) => {
				state.dmUnread[participantID] = false
			}),

		setCreateOrUpdateRoom: (open, room) =>
			set((state) => {
				if (open && !state.user) {
					state.popups['login'] = true
					return
				}
				state.createOrUpdateRoom.open = open
				state.createOrUpdateRoom.room = room
			}),

		joinedRoom: (event) =>
			set((state) => {
				if (event.data.user.id === state.user?.id) {
					state.sid = event.data.sid
				}
			}),

		addToRoomStreams: (streams) =>
			set((state) => {
				Object.entries(streams).forEach(([pID, streamID]) => {
					if (!state.roomStreams[pID]) {
						state.roomStreams[pID] = {
							streamID,
							mute: true,
							volume: 100,
							speaking: false,
						}
					} else {
						state.roomStreams[pID].streamID = streamID
					}
				})
			}),

		addMsg: (event) =>
			set((state) => {
				const isFromMe = event.data.from.id === state.user?.id
				const hasScrolledUp = state.scroll.percent < 98
				const hasScrolledDown = state.scroll.hasScrolledDown
				const isMessagesTab = state.roomTab === 'messages'
				const hasScrolled = hasScrolledDown && hasScrolledUp
				const isFocussed = document.hasFocus()

				if (event.data.roomID === ws.roomID) {
					if (
						!isFromMe &&
						(!isMessagesTab || !isFocussed || (isMessagesTab && hasScrolled))
					) {
						state.unreadCount += 1
					}
					state.messages.push(event.data)
					return
				}

				const id = getDMParticipant(
					event.data.from,
					event.data.participant!,
					state.user!
				)
				if (!state.dm[id]) {
					state.dm[id] = []
				}
				state.dm[id].push(event.data)

				// if this is the first message between these two
				// participants, fetch the dms to show in "messages" tab
				const dms: DMsRes[] = queryClient.getQueryData('dms') ?? []
				const hasDM = dms.findIndex((dm) => dm.user.id === id) !== -1
				if (!hasDM) {
					queryClient.invalidateQueries({
						queryKey: ['dms'],
					})
				}

				const isCurrentDM = state.selectedDM === id
				if (
					!isFromMe &&
					(!isCurrentDM || !isFocussed || (isCurrentDM && hasScrolled))
				) {
					state.dmUnread[id] = event.data.content
				}
			}),

		editMsg: (event) =>
			set((state) => {
				let messages = []
				if (event.data.roomID === ws.roomID) {
					messages = state.messages
				} else {
					const id = getDMParticipant(
						event.data.from,
						event.data.participant!,
						state.user!
					)
					messages = state.dm[id]
				}
				const { content, from, id } = event.data
				const index = messages.findIndex(
					(msg) => msg.id == id && msg.from.id === from.id
				)
				if (index === -1) {
					return
				}
				messages[index].isEdited = true
				messages[index].content = content
			}),

		deleteMsg: (event) =>
			set((state) => {
				let messages = []
				if (event.data.roomID === ws.roomID) {
					messages = state.messages
				} else {
					const id = getDMParticipant(
						event.data.from,
						event.data.participant!,
						state.user!
					)
					messages = state.dm[id]
				}
				const { from, id } = event.data
				const index = messages.findIndex(
					(msg) => msg.id == id && msg.from.id === from.id
				)
				if (index === -1) {
					return
				}
				messages[index].isDeleted = true
				messages[index].content = ''
			}),

		reactionToMsg: (event) =>
			set((state) => {
				let messages = []
				if (event.data.roomID === ws.roomID) {
					messages = state.messages
				} else {
					const id = getDMParticipant(
						event.data.from,
						event.data.participant!,
						state.user!
					)
					messages = state.dm[id] ?? []
				}
				const { id, reaction, from } = event.data
				const index = messages.findIndex((msg) => msg.id === id)
				if (index === -1) {
					return
				}
				if (!messages[index].reactions) {
					messages[index].reactions = {}
				}
				const reactions = messages[index].reactions
				if (!reactions[reaction]) {
					reactions[reaction] = {}
				}
				const isReacted = reactions[reaction][from.id]
				if (isReacted) {
					delete reactions[reaction][from.id]
					if (!Object.keys(reactions[reaction]).length) {
						delete reactions[reaction]
					}
				} else {
					reactions[reaction][from.id] = from
				}
			}),

		clearChat: (event) =>
			set((state) => {
				state.messages.forEach((msg) => {
					if (msg.from.id === event.data.participant.id && !msg.participant) {
						msg.isDeleted = true
						msg.content = ''
					}
				})
			}),

		setDM: (participantID, messages) =>
			set((state) => {
				if (!state.dm[participantID]) {
					state.dm[participantID] = []
				}
				const currentMessages = state.dm[participantID]
				state.dm[participantID] = [...messages, ...currentMessages]
				state.selectedDM = participantID
			}),

		clearDM: (participantID) =>
			set((state) => {
				state.dm[participantID] = []
				state.selectedDM = null
			}),

		setVolume: (pID, volume) =>
			set((state) => {
				if (!state.roomStreams[pID]) {
					state.roomStreams[pID] = {
						speaking: false,
						mute: true,
						streamID: null,
						volume: 100,
					}
				}
				state.roomStreams[pID].volume = volume
			}),

		setSpeaking: (streamID, speaking) =>
			set((state) => {
				const stream = Object.entries(state.roomStreams).find(
					([_, value]) => value.streamID === streamID
				)
				if (stream) {
					const [pID] = stream
					if (!state.roomStreams[pID]) {
						return
					}
					state.roomStreams[pID].speaking = speaking
					if (speaking) {
						state.roomStreams[pID].mute = false
					}
				}
			}),

		setMute: (event) =>
			set((state) => {
				const { mute, participantID: pID } = event.data
				if (!state.roomStreams[pID]) {
					state.roomStreams[pID] = {
						mute: true,
						volume: 100,
						streamID: null,
						speaking: false,
					}
				}
				state.roomStreams[pID].mute = mute
			}),

		error: (event) =>
			set((state) => {
				if (event.data.title === 'Room Full') {
					state.roomFull = true
					return
				}

				state.toast = {
					open: true,
					content: {
						type: 'error',
						title: event.data.title,
						description: event.data.content,
					},
				}
			}),

		kickParticipant: (event) =>
			set((state) => {
				if (event.data.participant.id === state.user?.id) {
					state.isKicked = {
						expiredAt: event.data.expiredAt,
					}
				}
			}),
	}))
)
