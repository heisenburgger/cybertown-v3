import { RelationRes } from '@/types'
import { useState } from 'react'
import { useRelation } from '@/hooks/queries/useRelation'
import { Users as UsersIcon } from 'lucide-react'
import { LoadingIcon } from '@/pages/home/components/LoadingIcon'
import { Profile } from '@/components/Profile'
import React from 'react'
import { useSocial } from '@/context/SocialContext'

const text = {
	following: "You're not following anyone yet. Pick your favorites!",
	followers: "You don't have any followers yet. Keep engaging!",
	friends: "You don't have any friends yet. Start connecting!",
} as const

type Props = {
	relation: 'followers' | 'following' | 'friends'
}

export const RelationList = React.forwardRef((props: Props, _ref) => {
	const [open, setOpen] = useState<Record<number, boolean>>({})
	const { data: users, isLoading } = useRelation(props.relation)
	const { actions: socialActions } = useSocial()

	function openDM(user: RelationRes) {
		if (user.isFriend) {
			socialActions.setDM(user)
		}
	}

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<LoadingIcon className="text-brand/20 fill-brand w-6 h-6" />
			</div>
		)
	}

	if (!isLoading && !users?.length) {
		return (
			<div className="flex-1 text-muted flex flex-col items-center justify-center gap-3">
				<UsersIcon strokeWidth={1.5} />
				<p className="max-w-[300px] text-center ">{text[props.relation]}</p>
			</div>
		)
	}

	return (
		<div className="flex-1 px-3 pb-3 overflow-auto scroller">
			{users.map((u) => {
				return (
					<div key={u.id} className="flex items-center gap-3 mt-4">
						<Profile
							user={u}
							classNames="w-8 h-8"
							open={open[u.id]}
							setOpen={(open) => {
								setOpen((prev) => ({
									...prev,
									[u.id]: open,
								}))
							}}
						/>
						<p className="ellipsis" role="button" onClick={() => openDM(u)}>
							{u.username}
						</p>
					</div>
				)
			})}
		</div>
	)
})
