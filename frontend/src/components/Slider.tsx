import * as RSlider from '@radix-ui/react-slider'

type Props = {
	min: number
	max: number
	value: number
	step: number
	setValue: (value: number) => void
}

export function Slider(props: Props) {
	return (
		<RSlider.Root
			className="relative flex h-5 w-[150px] touch-none select-none items-center"
			value={[props.value]}
			onValueChange={([val]) => props.setValue(val)}
			step={props.step}
		>
			<RSlider.Track className="relative h-[4px] grow rounded-full bg-accent">
				<RSlider.Range className="absolute h-full rounded-full bg-brand" />
			</RSlider.Track>
			<RSlider.Thumb className="block size-3 rounded-[10px] bg-brand focus:outline-none" />
		</RSlider.Root>
	)
}
