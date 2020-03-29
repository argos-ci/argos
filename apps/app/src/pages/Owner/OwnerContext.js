import React from 'react'

const OwnerContext = React.createContext()

export function OwnerProvider({ owner, children }) {
  return <OwnerContext.Provider value={owner}>{children}</OwnerContext.Provider>
}

export function useOwner() {
  return React.useContext(OwnerContext)
}
