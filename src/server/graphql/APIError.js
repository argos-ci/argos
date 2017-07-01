class APIError extends Error {
  constructor(...args) {
    super(...args)
    this.name = 'APIError'
    Error.captureStackTrace(this, APIError)
  }
}

export default APIError
