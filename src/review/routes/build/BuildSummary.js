import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import recompact from 'modules/recompact'
import BuildSummaryBody from 'review/routes/build/BuildSummaryBody'

const styleSheet = createStyleSheet('BuildSummary', theme => ({
  paper: {
    display: 'flex',
    marginBottom: theme.spacing.unit * 2,
  },
}))

export function BuildSummaryView(props) {
  const { classes, fetch } = props

  return (
    <div>
      <Typography type="headline" component="h3" gutterBottom>
        Summary
      </Typography>
      <Paper className={classes.paper}>
        <BuildSummaryBody build={fetch.output.data.build} />
      </Paper>
    </div>
  )
}

BuildSummaryView.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.build.fetch,
  }))
)(BuildSummaryView)
