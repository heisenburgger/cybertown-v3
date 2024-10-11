import { config } from '@/config'
import { fetchWrapper } from '@/lib/fetchWrapper'
import {
	CreateRoom,
	Room,
	RoomRes,
	User,
	Profile,
	RelationRes,
	DMsRes,
} from '@/types'
import { Message } from '@/types'
import { Option } from '@/components/Select'

export const api = {
	async me() {
		const url = config.apiURL + '/me'
		const data = await fetchWrapper<'user', User>(url)
		return data.user
	},

	async updateMe(bio: string) {
		const url = config.apiURL + '/me'
		const data = await fetchWrapper<'message', string>(url, {
			method: 'PUT',
			body: JSON.stringify({ bio }),
		})
		return data.message
	},

	async logout() {
		const url = config.apiURL + '/auth/logout'
		const data = await fetchWrapper<'message', string>(url, {
			method: 'DELETE',
		})
		return data.message
	},

	async createRoom(room: CreateRoom) {
		const url = config.apiURL + '/rooms'
		const data = await fetchWrapper<'roomID', number>(url, {
			method: 'POST',
			body: JSON.stringify(room),
		})
		return data.roomID
	},

	async updateRoom(roomID: number, room: CreateRoom) {
		const url = config.apiURL + `/rooms/${roomID}`
		const data = await fetchWrapper<'message', string>(url, {
			method: 'PUT',
			body: JSON.stringify(room),
		})
		return data.message
	},

	async getRooms() {
		const url = config.apiURL + '/rooms'
		const data = await fetchWrapper<'rooms', RoomRes[]>(url)
		return data.rooms
	},

	async joinRoom(roomID: number) {
		const url = config.apiURL + `/rooms/${roomID}/join`
		const data = await fetchWrapper<'room', Room>(url)
		return data.room
	},

	async getProfile(userID: number) {
		const url = config.apiURL + `/profile/${userID}`
		const data = await fetchWrapper<'profile', Profile>(url)
		return data.profile
	},

	async follow(followeeID: number, isFollowing: boolean) {
		const url = config.apiURL + '/follow'
		const data = await fetchWrapper<'msg', string>(url, {
			method: isFollowing ? 'DELETE' : 'POST',
			body: JSON.stringify({ followeeID }),
		})
		return data.msg
	},

	async updateDM(participantID: number) {
		const url = config.apiURL + `/dms/${participantID}`
		const data = await fetchWrapper<'msg', string>(url, {
			method: 'PUT',
		})
		return data.msg
	},

	async getRelations(relation: string) {
		const url = config.apiURL + `/relations?relation=${relation}`
		const data = await fetchWrapper<'users', RelationRes[]>(url)
		return data.users
	},

	async getDMs() {
		const url = config.apiURL + '/dms'
		const data = await fetchWrapper<'dms', DMsRes[]>(url)
		return data.dms
	},

	async getMessages(participantID: number, cursor?: string) {
		const url = config.apiURL + `/messages/${participantID}`
		const data = await fetchWrapper<'messages', Message[]>(url, {
			method: 'POST',
			body: JSON.stringify({ cursor }),
		})
		return data.messages
	},

	async emoji() {
		const url = 'https://cdn.jsdelivr.net/npm/@emoji-mart/data'
		const res = await fetch(url)
		const data = await res.json()
		return data
	},

	async getLanguages() {
		const url = config.apiURL + '/languages'
		const data = await fetchWrapper<'languages', Option[]>(url)
		return data.languages
	},
}
