import React from 'react'
import ErrorView from 'review/routes/error/ErrorView'

function ErrorNotFound() {
  return (
    <ErrorView
      title="404: Something's Missing"
      message="We're sorry! It seems like this page cannot be found."
    />
  )
}

export default ErrorNotFound
