import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'
import ClientErrorView from 'review/modules/components/ClientErrorView'

const styles = {
  code: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
}

function ErrorServer(props) {
  const { error, classes } = props

  return (
    <ClientErrorView
      title={`Error ${error.statusCode}`}
      message={
        <div>
          {error.message && <div>{error.message}</div>}
          {error.stack && (
            <code>
              <pre className={classes.code}>{error.stack}</pre>
            </code>
          )}
        </div>
      }
    />
  )
}

ErrorServer.propTypes = {
  classes: PropTypes.object.isRequired,
  error: PropTypes.object.isRequired,
}

export default withStyles(styles)(ErrorServer)
