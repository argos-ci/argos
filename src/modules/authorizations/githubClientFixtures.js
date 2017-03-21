import { stub } from 'sinon'

export const notFoundToken = () => {
  const notFoundError = new Error('Not found')
  notFoundError.code = 404
  return stub().rejects(notFoundError)
}

export const validToken = ({ scopes }) => stub().resolves({ data: { scopes } })
