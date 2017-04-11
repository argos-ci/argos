import React from 'react'
import PropTypes from 'prop-types'
import ErrorView from 'review/routes/error/ErrorView'

function ErrorServer(props) {
  const { error } = props

  return (
    <ErrorView
      title={`Error ${error.statusCode}`}
      message={
        <div>
          {error.message && <div>{error.message}</div>}
          {error.stack && <code><pre>{error.stack}</pre></code>}
        </div>
      }
    />
  )
}

ErrorServer.propTypes = {
  error: PropTypes.object.isRequired,
}

export default ErrorServer
