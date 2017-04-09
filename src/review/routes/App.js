import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import ErrorServer from 'review/routes/error/ErrorServer'

function App(props) {
  const {
    error,
    children,
  } = props

  if (error) {
    return <ErrorServer error={error} />
  }

  return children
}

App.propTypes = {
  error: PropTypes.object,
  children: PropTypes.node.isRequired,
}

export default connect(state => ({
  error: state.data.error,
}))(App)
