import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import actionTypes from 'review/modules/redux/actionTypes'
import BuildSummary from 'review/routes/build/Summary'
import BuildScreenshots from 'review/routes/build/Screenshots'

class Build extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    params: PropTypes.shape({
      buildId: PropTypes.string.isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.props.dispatch({
      type: actionTypes.BUILD_FETCH,
      payload: {
        buildId: this.props.params.buildId,
      },
    })
  }

  render() {
    return (
      <div>
        <BuildSummary />
        <BuildScreenshots />
      </div>
    )
  }
}

export default connect()(Build)
