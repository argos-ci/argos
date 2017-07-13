import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import ErrorServer from 'review/routes/error/ErrorServer'

function App(props) {
  const { error, children } = props

  if (error) {
    return <ErrorServer error={error} />
  }

  return children
}

App.propTypes = {
  children: PropTypes.node.isRequired,
  error: PropTypes.object,
}

export default connect(state => ({
  error: state.data.error,
}))(App)
