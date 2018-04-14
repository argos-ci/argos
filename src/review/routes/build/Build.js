import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import { withStyles } from 'material-ui/styles'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import actionTypes from 'modules/redux/actionTypes'
import BuildSummary from 'review/routes/build/BuildSummary'
import BuildScreenshots from 'review/routes/build/BuildScreenshots'

const styles = {
  paper: {
    display: 'flex',
  },
}

function Build(props) {
  const { fetch, classes } = props

  return (
    <div>
      <WatchTask task={fetch}>
        {data => {
          if (!data.build) {
            return (
              <Paper className={classes.paper}>
                <WatchTaskContainer>
                  <Typography>Build not found.</Typography>
                </WatchTaskContainer>
              </Paper>
            )
          }

          return (
            <div>
              <BuildSummary />
              <BuildScreenshots />
            </div>
          )
        }}
      </WatchTask>
    </div>
  )
}

Build.propTypes = {
  classes: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
  fetch: PropTypes.object.isRequired,
  params: PropTypes.shape({
    buildId: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styles),
  connect(state => ({
    fetch: state.ui.build.fetch,
  })),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.BUILD_FETCH,
        payload: {
          buildId: this.props.params.buildId,
        },
      })
    },
  })
)(Build)
