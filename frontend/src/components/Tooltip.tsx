import React from 'react'
import * as RTooltip from '@radix-ui/react-tooltip'

type Props = {
	children: React.ReactNode
	title: string
}

export const Tooltip = React.forwardRef((props: Props, _ref) => {
	const { children, title, ...others } = props
	return (
		<RTooltip.Provider>
			<RTooltip.Root>
				<RTooltip.Trigger asChild {...others}>
					{children}
				</RTooltip.Trigger>
				<RTooltip.Portal>
					<RTooltip.Content sideOffset={8}>
						<p className="rounded-lg p-1 px-3 bg-bg border border-border max-w-[300px]">
							{title}
						</p>
						<RTooltip.Arrow className="fill-brand" />
					</RTooltip.Content>
				</RTooltip.Portal>
			</RTooltip.Root>
		</RTooltip.Provider>
	)
})
