import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { QueryClient } from 'react-query'
import { config } from '@/config'
import { ZodError } from 'zod'
import { Message } from '@/types'
import { User } from '@/types'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { renderer } from './md-renderer'
import { useAppStore } from '@/stores/appStore'
import { isToday, isThisWeek, format } from 'date-fns'
import hark from 'hark'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			refetchOnWindowFocus: false,
		},
	},
})

export function getGoogleOAuthURL() {
	const options = {
		redirect_uri: config.googleOAuth.redirectURL,
		client_id: config.googleOAuth.clientID,
		access_type: 'offline',
		response_type: 'code',
		prompt: 'consent',
		state: JSON.stringify({ redirectURL: window.location.href }),
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email',
		].join(' '),
	}

	const qs = new URLSearchParams(options)

	return `${config.googleOAuth.rootURL}?${qs.toString()}`
}

export function toHHMM(createdAt: string) {
	const date = new Date(createdAt)
	const options = {
		hour: 'numeric',
		minute: 'numeric',
		hour12: true,
	} as const
	const formattedTime = date.toLocaleString('en-US', options)
	return formattedTime
}

export function scrollToMessage(id: string, blink = true) {
	const el = document.getElementById(`message-${id}`)
	if (!el) {
		return
	}
	el.scrollIntoView()
	if (blink) {
		el.classList.add('blink-bg')
		setTimeout(() => {
			el.classList.remove('blink-bg')
		}, 1500)
	}
}

export function flattenError(error: ZodError) {
	const fieldErrors = error.flatten().fieldErrors
	const errors: Record<string, string> = Object.entries(fieldErrors).reduce(
		(acc, curr) => {
			const [key, value] = curr
			if (Array.isArray(value)) {
				return {
					...acc,
					[key]: value[0],
				}
			}
			return acc
		},
		{}
	)
	return errors
}

export function getParticipantID(message: Message | undefined, me: User) {
	if (!message?.participant) {
		return undefined
	}
	if (message.participant.id === me.id) {
		return message.from.id
	}
	return message.participant.id
}

export class APIError extends Error {
	status: number
	errors: Record<string, any>

	constructor(message: string, status: number, errors: Record<string, any>) {
		super(message)
		this.name = 'APIError'
		this.status = status
		this.errors = errors
	}
}

export function secondsToHHMMSS(seconds: number) {
	let hours = Math.floor(seconds / 3600)
	let minutes = Math.floor((seconds % 3600) / 60)
	let sec = Math.floor(seconds % 60)
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function toHTML(md: string): string {
	const allowedTags = [
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'strong',
		'em',
		'b',
		'i',
		'u',
		'ul',
		'ol',
		'li',
		'p',
		'blockquote',
		'hr',
		'pre',
		'code',
		'a',
		'table',
		'tr',
		'td',
		'th',
		'br',
	]

	const allowedAttributes = ['class', 'href', 'rel', 'title', 'target', 'style']

	// akshually it returns Promise<string>
	const html = marked.parse(md, { renderer, breaks: true }) as string

	let cleanHTML = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: allowedTags,
		ALLOWED_ATTR: allowedAttributes,
	})

	const username = useAppStore.getState().user?.username
	if (username) {
		cleanHTML = cleanHTML.replace(
			`<code>@${username}</code>`,
			`<code class="user-mention">@${username}</code>`
		)
	}

	if (!cleanHTML) {
		return toHTML('```' + md + '```')
	}

	return cleanHTML
}

export function formatDate(date: string) {
	if (isToday(date)) {
		return format(date, 'hh:mm a')
	} else if (isThisWeek(date, { weekStartsOn: 1 })) {
		return format(date, 'EEEE')
	} else {
		return format(date, 'yyyy/MM/dd')
	}
}

export function getDMParticipant(
	from: User,
	participant: User,
	currentUser: User
) {
	return from.id !== currentUser.id ? from.id : participant.id
}

export function generateRandomID() {
	const array = new Uint32Array(1)
	window.crypto.getRandomValues(array)
	return array[0].toString(16)
}

export async function waitFor(n: number) {
	return new Promise((res) => {
		setTimeout(() => {
			res('ok')
		}, n * 1000)
	})
}

export function monitorStream(stream: MediaStream) {
	const speechEvent = hark(stream)
	speechEvent.on('speaking', () =>
		useAppStore.getState().setSpeaking(stream.id, true)
	)
	speechEvent.on('stopped_speaking', () =>
		useAppStore.getState().setSpeaking(stream.id, false)
	)
}

export function debounce(func: Function, delay: number) {
	let timeout: ReturnType<typeof setTimeout>
	return (...args: any[]) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), delay)
	}
}

export function removeAudioStreams() {
	const audio = Array.from(document.querySelectorAll('audio[data-pid]'))
	audio.forEach((el) => el.remove())
}
