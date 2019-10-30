import React from 'react'
import { Button } from '@smooth-ui/core-sc'
import { VALIDATION_STATUSES } from 'server/constants'
import { useValidationStatusBuild } from './BuildContext'

export default function BuildDetailAction({ build }) {
  const { setValidationStatus, loading } = useValidationStatusBuild()
  let actionMessage
  let variant
  let validationStatus

  switch (build.status) {
    case 'success':
      actionMessage = 'Reject'
      variant = 'danger'
      validationStatus = VALIDATION_STATUSES.rejected
      break
    case 'failure':
      actionMessage = 'Approve'
      variant = 'success'
      validationStatus = VALIDATION_STATUSES.accepted
      break
    default:
      return null
  }

  return (
    <Button
      disabled={loading}
      variant={variant}
      onClick={() =>
        setValidationStatus({
          variables: {
            buildId: build.id,
            validationStatus,
          },
        })
      }
    >
      {actionMessage}
    </Button>
  )
}
