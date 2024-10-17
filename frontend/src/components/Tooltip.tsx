import React from 'react'
import * as RTooltip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

type Props = {
	children: React.ReactNode
	title: string | React.ReactNode
	delay?: number
	classNames?: string
}

export const Tooltip = React.forwardRef((props: Props, _ref) => {
	const { children, title, delay = 900, classNames = '', ...others } = props
	return (
		<RTooltip.Provider>
			<RTooltip.Root delayDuration={delay}>
				<RTooltip.Trigger asChild {...others}>
					{children}
				</RTooltip.Trigger>
				<RTooltip.Portal>
					<RTooltip.Content sideOffset={8}>
						<p
							className={cn(
								'rounded-lg p-1 px-3 bg-bg border border-border max-w-[300px]',
								classNames
							)}
						>
							{title}
						</p>
						<RTooltip.Arrow className="fill-brand" />
					</RTooltip.Content>
				</RTooltip.Portal>
			</RTooltip.Root>
		</RTooltip.Provider>
	)
})
