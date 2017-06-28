import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import ErrorView from 'review/routes/error/ErrorView'

const styleSheet = createStyleSheet('ErrorServer', () => ({
  code: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
}))

function ErrorServer(props) {
  const { error, classes } = props

  return (
    <ErrorView
      title={`Error ${error.statusCode}`}
      message={
        <div>
          {error.message &&
            <div>
              {error.message}
            </div>}
          {error.stack &&
            <code>
              <pre className={classes.code}>
                {error.stack}
              </pre>
            </code>}
        </div>
      }
    />
  )
}

ErrorServer.propTypes = {
  classes: PropTypes.object.isRequired,
  error: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(ErrorServer)
