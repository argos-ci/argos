export function getStatusColor(status) {
  switch (status) {
    case 'success':
      return 'success'
    case 'failure':
    case 'error':
      return 'danger'
    case 'neutral':
      return 'light400'
    case 'pending':
    case 'warning':
    default:
      return 'warning'
  }
}
