import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import actionTypes from 'review/modules/redux/actionTypes'
import BuildSummary from 'review/routes/build/BuildSummary'
import BuildScreenshots from 'review/routes/build/BuildScreenshots'

const styleSheet = createStyleSheet('Build', () => ({
  paper: {
    display: 'flex',
  },
}))

function Build(props) {
  const {
    fetch,
    classes,
  } = props

  return (
    <div>
      <WatchTask task={fetch}>
        {() => {
          if (!fetch.output.data.build) {
            return (
              <Paper className={classes.paper}>
                <WatchTaskContainer>
                  <Text>
                    Build not found.
                  </Text>
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
  withStyles(styleSheet),
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
  }),
)(Build)
