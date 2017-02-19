import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import recompact from 'modules/recompact'
import actionTypes from 'review/modules/redux/actionTypes'
import BuildSummary from 'review/routes/build/BuildSummary'
import BuildScreenshots from 'review/routes/build/BuildScreenshots'

function Build() {
  return (
    <div>
      <BuildSummary />
      <BuildScreenshots />
    </div>
  )
}

Build.propTypes = {
  dispatch: PropTypes.func.isRequired,
  params: PropTypes.shape({
    buildId: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  connect(),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.BUILD_FETCH,
        payload: {
          buildId: this.props.params.buildId,
        },
      })
    },
  }),
)(Build)
