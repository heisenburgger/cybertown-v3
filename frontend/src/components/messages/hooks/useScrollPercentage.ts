import { bc } from '@/lib/bc'
import { debounce } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import { User } from '@/types'
import { useEffect, RefObject } from 'react'

export const useScrollPercentage = (
	dm: User | null,
	containerRef: RefObject<HTMLDivElement>
) => {
	const setUnreadCount = useAppStore().setUnreadCount
	const setDMRead = useAppStore().setDMReadForParticipant
	const hasScrolledDown = useAppStore().scroll.hasScrolledDown
	const setScrollPercent = useAppStore().setScrollPercent
	const setScrolledDown = useAppStore().setScrolledDown

	useEffect(() => {
		const container = containerRef.current

		const handleScroll = debounce(() => {
			if (!container) {
				return
			}

			const scrollTop = container.scrollTop
			const scrollHeight = container.scrollHeight
			const clientHeight = container.clientHeight

			const totalScroll = scrollHeight - clientHeight
			const scrollPercent = (scrollTop / totalScroll) * 100

			if (!hasScrolledDown && scrollPercent >= 98) {
				setScrolledDown(true)
			}

			if (!dm && scrollPercent >= 98) {
				setUnreadCount(0)
			} else if (dm && scrollPercent >= 98) {
				setDMRead(dm.id)
				bc.sendMessage({ name: 'DM_READ_PARTICIPANT', participantID: dm.id })
			}

			setScrollPercent(scrollPercent)
		}, 300)

		if (container) {
			container.addEventListener('scroll', handleScroll)
		}

		return () => {
			if (container) {
				container.removeEventListener('scroll', handleScroll)
				setScrolledDown(false)
			}
		}
	}, [containerRef.current])
}
