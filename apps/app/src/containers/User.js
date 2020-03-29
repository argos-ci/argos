import React from 'react'
import gql from 'graphql-tag'
import { useAuthToken, useLogout } from './Auth'
import { useQuery } from './Apollo'

const UserContext = React.createContext()

const UserQuery = gql`
  query User {
    user {
      id
      email
      name
      login
      privateSync
      latestSynchronization {
        id
        jobStatus
      }
      installations {
        id
        latestSynchronization {
          id
          jobStatus
        }
      }
    }
  }
`

export function UserInitializer({ children }) {
  const token = useAuthToken()
  const logout = useLogout()
  const { loading, data, refetch } = useQuery(UserQuery, { skip: !token })

  // Remove token if outdated
  React.useEffect(() => {
    if (!loading && token && data.user === null) {
      logout()
    }
  }, [loading, token, data, logout])
  const user = token && !loading ? data.user : null
  React.useEffect(() => {
    if (user) {
      window.gtag('set', { user_id: user.id })
    } else {
      window.gtag('set', { user_id: null })
    }
  }, [user])
  const value = React.useMemo(() => ({ user, refetch }), [user, refetch])
  if (loading && token) return null
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const { user } = React.useContext(UserContext)
  return user
}

export function useRefetchUser() {
  const { refetch } = React.useContext(UserContext)
  return refetch
}
