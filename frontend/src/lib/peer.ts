import { useAppStore } from '@/stores/appStore'
import { ws } from './ws'
import { monitorStream } from './utils'

class Peer {
	private static instance: Peer
	pc: RTCPeerConnection | null = null
	track: MediaStreamTrack | null = null

	static getInstance(): Peer {
		if (!Peer.instance) {
			this.instance = new Peer()
		}
		return this.instance
	}

	createPeer() {
		if (this.pc) {
			this.pc.close()
			this.pc = null
			this.track = null
		}

		const configuration = {
			iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
		}
		const pc = new RTCPeerConnection(configuration)
		this.pc = pc

		pc.ontrack = (e) => {
			if (e.track.kind !== 'audio') {
				console.warn('skipping incompatible track', e.track.kind)
				return
			}
			const [stream] = e.streams

			const roomStreams = useAppStore.getState().roomStreams
			const entry = Object.entries(roomStreams).find(
				([_, value]) => value.streamID === stream.id
			)

			if (!entry) {
				console.warn('failed to get stream entry from store', stream.id)
				return
			}

			const [pID, value] = entry
			this.playStream(pID, value.volume ?? 100, stream)
			monitorStream(stream)
		}

		pc.onicecandidate = (e) => {
			if (!e.candidate) {
				return
			}
			ws.peerICECandidate(JSON.stringify(e.candidate))
		}
	}

	async playStream(pID: string, volume: number, stream: MediaStream) {
		const existingAudio = document.querySelector(`audio[data-pid="${pID}"]`)
		if (existingAudio) {
			existingAudio.remove()
		}

		const element = document.createElement('audio')
		element.dataset.id = stream.id
		element.dataset.pid = pID
		element.srcObject = stream
		element.autoplay = true
		element.volume = volume / 100
		element.play()

		document.body.appendChild(element)
	}

	async speak() {
		try {
			const pc = this.pc!

			// this will prompt the user to give permissions
			await navigator.mediaDevices.getUserMedia({ audio: true })

			const devices = await navigator.mediaDevices.enumerateDevices()
			const defaultDevice = devices.find(
				(device) =>
					device.kind === 'audioinput' && device.deviceId === 'default'
			)

			if (!defaultDevice) {
				throw new Error('No default audio input device found')
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { deviceId: defaultDevice.deviceId },
			})

			stream.getTracks().forEach((track) => {
				pc.addTrack(track, stream)
				monitorStream(stream)
				this.track = track
			})
			this.makeOffer()
		} catch (err) {
			throw err
		}
	}

	async makeOffer() {
		if (!this.pc) {
			return
		}
		try {
			const offer = await this.pc.createOffer()
			await this.pc.setLocalDescription(offer)
			ws.peerOffer(JSON.stringify(offer))
		} catch (err) {
			console.error('failed to make offer', err)
		}
	}

	async acceptOffer(data: string) {
		const pc = this.pc!
		try {
			await pc.setRemoteDescription(JSON.parse(data))
			const answer = await pc.createAnswer()
			await pc.setLocalDescription(answer)
			ws.peerAnswer(JSON.stringify(answer))
		} catch (err) {
			console.error('failed to accept offer', err)
		}
	}
}

export const peer = Peer.getInstance()
