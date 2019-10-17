import React from 'react'
import ClientErrorView from 'review/modules/components/ClientErrorView'

function ErrorNotFound() {
  return (
    <ClientErrorView
      title="404: Something's Missing"
      message="We're sorry! It seems like this page cannot be found."
    />
  )
}

export default ErrorNotFound
