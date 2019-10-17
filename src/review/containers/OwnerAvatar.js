import React from 'react'
import { Avatar } from 'components'

export const OwnerAvatar = React.forwardRef(function OwnerAvatar(
  { owner, ...props },
  ref,
) {
  return (
    <Avatar
      ref={ref}
      alt={owner.name}
      src={`https://github.com/${owner.login}.png?size=60`}
      {...props}
    />
  )
})
