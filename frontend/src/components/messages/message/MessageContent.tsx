import { toHTML } from '@/lib/utils'
import { Message } from '@/types'

type Props = {
	message: Message
	classNames?: string
}

export function MessageContent(props: Props) {
	const { message } = props

	if (props.message.isDeleted) {
		return <p className="italic text-muted">This message has been deleted</p>
	}

	return (
		<article
			className="prose"
			dangerouslySetInnerHTML={{
				__html: toHTML(message.content),
			}}
		/>
	)
}
