export function getBuildStatus(build) {
  if (build.jobStatus === 'complete') {
    return build.conclusion
  }
  return 'pending'
}

export function getStatusColor(status) {
  switch (status) {
    case 'success':
      return 'success'
    case 'failure':
      return 'danger'
    case 'neutral':
      return 'gray600'
    case 'pending':
    case 'warning':
    default:
      return 'warning'
  }
}
