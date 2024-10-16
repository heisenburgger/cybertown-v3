import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/appStore'
import * as Dropdown from '@radix-ui/react-dropdown-menu'
import { useState } from 'react'
import {
	ChevronDown as ChevronDownIcon,
	SquarePen as PencilIcon,
	Trash as TrashIcon,
	ReplyAll as ReplyIcon,
	SmilePlus as EmojiIcon,
} from 'lucide-react'
import { ws } from '@/lib/ws'
import { Props as MessageProps } from '.'

type MessageOptionsProps = MessageProps & {
	setEmojiOpen: (open: boolean) => void
	side?: 'bottom' | 'top' | 'right' | 'left'
	align?: 'start' | 'center' | 'end'
}

export function MessageOptions(props: MessageOptionsProps) {
	const { align = 'start', side = 'bottom' } = props
	const [open, setOpen] = useState(false)
	const user = useAppStore().user
	const isMyMessage = user?.id === props.message.from.id

	function handleReply() {
		props.setEditMsgID(undefined)
		props.setReplyTo(props.message.id)

		// if you remove the `setTimeout`, it won't work
		setTimeout(() => {
			if (props.textareaRef.current) {
				props.textareaRef.current.focus()
			}
		}, 0)
	}

	function handleEdit() {
		props.setReplyTo(undefined)
		props.setPM(null)
		props.setEditMsgID(props.message.id)

		// if you remove the `setTimeout`, it won't work
		setTimeout(() => {
			if (props.textareaRef.current) {
				props.textareaRef.current.focus()
				props.textareaRef.current.value = props.message.content
			}
		}, 0)
	}

	return (
		<Dropdown.Root onOpenChange={setOpen}>
			<Dropdown.Trigger asChild>
				<span
					role="button"
					className={cn('invisible', {
						visible: open,
						'group-hover:visible': !props.message.isDeleted,
					})}
				>
					<ChevronDownIcon size={18} className="text-muted" />
				</span>
			</Dropdown.Trigger>
			<Dropdown.Portal>
				<Dropdown.Content
					className="rounded-lg p-2 shadow-md bg-bg flex flex-col gap-2 border border-border"
					side={side}
					sideOffset={12}
					align={align}
					onCloseAutoFocus={(e) => e.preventDefault()}
				>
					{isMyMessage && (
						<>
							<Dropdown.Item
								className="flex gap-3 items-center data-[highlighted]:outline-none data-[highlighted]:bg-accent px-2 py-1 rounded-md"
								onClick={handleEdit}
							>
								<PencilIcon size={20} className="text-muted" />
								<span>Edit</span>
							</Dropdown.Item>
							<Dropdown.Item
								className="flex gap-3 items-center data-[highlighted]:outline-none data-[highlighted]:bg-accent px-2 py-1 rounded-md"
								onClick={() => {
									ws.deleteMsg(
										props.message.id,
										props.message.participant?.id || props.dm?.id,
										props.dm !== null
									)
								}}
							>
								<TrashIcon size={20} className="text-muted" />
								<span>Delete</span>
							</Dropdown.Item>
						</>
					)}
					<Dropdown.Item
						className="flex gap-3 items-center data-[highlighted]:outline-none data-[highlighted]:bg-accent px-2 py-1 rounded-md"
						onClick={handleReply}
					>
						<ReplyIcon size={20} className="text-muted" />
						<span>Reply</span>
					</Dropdown.Item>
					<Dropdown.Item
						className="flex gap-3 items-center data-[highlighted]:outline-none data-[highlighted]:bg-accent px-2 py-1 rounded-md"
						onClick={() => props.setEmojiOpen(true)}
					>
						<EmojiIcon size={20} className="text-muted" />
						<span>React</span>
					</Dropdown.Item>
				</Dropdown.Content>
			</Dropdown.Portal>
		</Dropdown.Root>
	)
}
