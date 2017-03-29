import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import BuildSummaryBody from 'review/routes/build/BuildSummaryBody'

const styleSheet = createStyleSheet('BuildSummary', (theme) => {
  return {
    paper: {
      display: 'flex',
      marginBottom: theme.spacing.unit * 2,
    },
  }
})

export function BuildSummary(props) {
  const {
    classes,
    fetch,
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        Summary
      </Text>
      <Paper className={classes.paper}>
        <WatchTask task={fetch}>
          {() => <BuildSummaryBody build={fetch.output.data.build} />}
        </WatchTask>
      </Paper>
    </div>
  )
}

BuildSummary.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => state.ui.build),
)(BuildSummary)
