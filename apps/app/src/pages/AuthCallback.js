import React from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import qs from 'query-string'
import axios from 'axios'
import { useAuth } from '../containers/Auth'

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
})

export function AuthCallback() {
  const location = useLocation()
  const history = useHistory()
  const { code } = qs.parse(location.search)
  const { setToken } = useAuth()
  React.useEffect(() => {
    api
      .post('/auth/github', { code })
      .then(result => {
        setToken(result.data.access_token)
        history.push('/')
      })
      .catch(error => {
        console.error(error)
      })
  }, [code, history, setToken])

  return null
}
