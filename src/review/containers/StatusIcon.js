import React from 'react'
import { Box } from '@xstyled/styled-components'
import { FaTimes, FaCheck, FaDotCircle } from 'react-icons/fa'
import { getStatusColor } from 'modules/build'

export function StatusIcon({ status, ...props }) {
  const buildColor = getStatusColor(status)
  switch (status) {
    case 'failure':
      return <Box forwardedAs={FaTimes} color={buildColor} {...props} />
    case 'success':
      return <Box forwardedAs={FaCheck} color={buildColor} {...props} />
    case 'pending':
      return <Box forwardedAs={FaDotCircle} color={buildColor} {...props} />
    case 'neutral':
      return <Box forwardedAs={FaDotCircle} color={buildColor} {...props} />
    default:
      return null
  }
}
