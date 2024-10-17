import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import * as RToast from '@radix-ui/react-toast'
import { X as CloseIcon, Info as InfoIcon, Ban as BanIcon } from 'lucide-react'

export function Toast() {
	const toast = useAppStore().toast
	const setToast = useAppStore().setToast
	const iconMap = {
		error: BanIcon,
		info: InfoIcon,
	}
	const Icon = toast.content?.type ? iconMap[toast.content.type] : null
	const timerRef = useRef<ReturnType<typeof setTimeout>>()

	useEffect(() => {
		if (toast.open) {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
			}

			timerRef.current = setTimeout(() => {
				setToast(false)
			}, 3000)

			return () => clearTimeout(timerRef.current)
		}
	}, [toast.open, setToast])

	return (
		<RToast.Root
			className="border border-border bg-bg-2 shadow-md rounded-md pl-6 pr-10 py-4 relative flex flex-col gap-2"
			open={toast.open}
			onOpenChange={setToast}
		>
			<RToast.Title className="font-semibold flex gap-2 items-center">
				{Icon && <Icon size={18} className="text-muted" />}
				<span>{toast.content?.title}</span>
			</RToast.Title>
			<RToast.Description className="text-muted">
				{toast.content?.description}
			</RToast.Description>
			<RToast.Close asChild>
				<button className="absolute top-3 right-4">
					<CloseIcon size={20} className="text-muted" />
				</button>
			</RToast.Close>
		</RToast.Root>
	)
}
