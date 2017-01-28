import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import ProductHome from 'review/routes/product/Home'
import Dashboard from 'review/routes/dashboard/Dashboard'

function Homepage(props) {
  return props.user ? <Dashboard /> : <ProductHome />
}

Homepage.propTypes = {
  user: PropTypes.object,
}

export default connect(state => state.data)(Homepage)
