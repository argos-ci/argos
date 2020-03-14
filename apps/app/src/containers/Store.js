import React from 'react'
import store from 'store'

export function useStoreState(name, initialValue = null) {
  const [state, setState] = React.useState(() => {
    const value = store.get(name)
    return value === undefined ? initialValue : value
  })
  React.useEffect(() => {
    if (state === null) {
      store.remove(name)
    } else {
      store.set(name, state)
    }
  }, [name, state])
  return [state, setState]
}
