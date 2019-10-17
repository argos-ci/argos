import React from 'react'
import axios from 'axios'

export function StatsLoader({ url, fallback = null, children }) {
  const [state, setState] = React.useState({
    error: null,
    result: null,
    loading: true,
  })
  React.useEffect(() => {
    setState({ error: null, result: null, loading: true })
    axios
      .get(url)
      .then(response => {
        setState({ error: null, result: response.data, loading: false })
      })
      .catch(error => {
        setState({ error, result: null, loading: false })
      })
  }, [url])

  if (state.error) throw state.error
  if (state.loading) return fallback
  if (!state.result) return null
  return children(state.result)
}
