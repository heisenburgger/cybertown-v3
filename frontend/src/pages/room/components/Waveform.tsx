import { cn } from '@/lib/utils'

export function Waveform() {
	return (
		<div className="flex justify-between h-4 w-5">
			{[1, 2, 3, 4].map((i) => (
				<div
					key={i}
					className={cn(
						'h-full w-1 bg-brand rounded-lg transform origin-bottom animate-[waveform-base_1.2s_ease-in-out_infinite',
						{
							'animate-[waveform-quiet_1.2s_ease-in-out_infinite]':
								i === 1 || i === 3,
							'animate-[waveform-normal_1.2s_ease-in-out_infinite]': i === 2,
							'animate-[waveform-loud_1.2s_ease-in-out_infinite]': i == 4,
						}
					)}
				/>
			))}
		</div>
	)
}
