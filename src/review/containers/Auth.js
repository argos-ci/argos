import React from 'react'
import { useStoreState } from './Store'

const AuthContext = React.createContext()

function AuthProvider({ children }) {
  const [token, setToken] = useStoreState('token', null)
  const value = React.useMemo(() => ({ token, setToken }), [token, setToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthInitializer = AuthProvider

export function useAuth() {
  return React.useContext(AuthContext)
}

export function useAuthToken() {
  const { token } = useAuth()
  return token || null
}

export function useLogout() {
  const { setToken } = useAuth()
  return React.useCallback(() => setToken(null), [setToken])
}
