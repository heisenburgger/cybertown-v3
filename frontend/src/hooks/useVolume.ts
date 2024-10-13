import { debounce } from '@/lib/utils'
import { useEffect } from 'react'

export function useVolume(pID: string, volume: number) {
	const changeVolume = debounce(() => {
		const element: HTMLAudioElement | null = document.querySelector(
			`audio[data-pid="${pID}"]`
		)
		if (!element) {
			return
		}
		element.volume = volume / 100
	}, 300)

	useEffect(() => {
		changeVolume()
	}, [volume, pID])
}
