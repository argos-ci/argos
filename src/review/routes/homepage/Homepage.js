import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import ProductHome from 'review/routes/product/Home'
import Error from 'review/routes/Error'
import Dashboard from 'review/routes/dashboard/Dashboard'

function Homepage({ user, error }) {
  if (error) {
    return <Error />
  }

  if (user) {
    return <Dashboard />
  }

  return <ProductHome />
}

Homepage.propTypes = {
  error: PropTypes.object,
  user: PropTypes.object,
}

export default connect(state => state.data)(Homepage)
