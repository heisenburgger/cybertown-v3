import { useEffect } from 'react'
import { User } from '@/types'

type Props = {
	user: User
	setIsOnboarding: (done: boolean) => void
}

export function Onboarding(props: Props) {
	useEffect(() => {
		function clickListener() {
			props.setIsOnboarding(false)
		}
		window.addEventListener('click', clickListener)
		return function () {
			window.removeEventListener('click', clickListener)
		}
	}, [])

	return (
		<main className="h-full w-full flex items-center justify-center">
			<div
				role="button"
				className="px-4 flex flex-col gap-6 items-center text-center"
			>
				<p className="max-w-[320px]">Hi, {props.user.username}</p>
				<img
					className="w-40 h-40 rounded-full"
					src={props.user.avatar}
					referrerPolicy="no-referrer"
				/>
				<p>Tap anywhere and let the fun begin!</p>
			</div>
		</main>
	)
}
