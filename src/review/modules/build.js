export function getStatusColor(status) {
  switch (status) {
    case 'success':
      return 'success'
    case 'failure':
    case 'error':
      return 'danger'
    case 'neutral':
      return 'gray600'
    case 'pending':
    case 'warning':
    default:
      return 'warning'
  }
}
