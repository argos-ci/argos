function getStats(statuses) {
  return statuses.reduce(
    (stats, status) => {
      stats[status] += 1
      return stats
    },
    {
      pending: 0,
      progress: 0,
      complete: 0,
      error: 0,
    }
  )
}

function reduceJobStatus(statuses) {
  const stats = getStats(statuses)

  if (stats.complete === statuses.length) {
    return 'complete'
  } else if (stats.pending === statuses.length) {
    return 'pending'
  }

  return 'progress'
}

export default reduceJobStatus
