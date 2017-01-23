import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui-build-next/src/styles/withStyles'
import Text from 'material-ui-build-next/src/Text'
import Paper from 'material-ui-build-next/src/Paper'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'

const styleSheet = createStyleSheet('BuildSummary', () => {
  return {
    paper: {
      overflow: 'auto',
      marginBottom: 8 * 2,
    },
  }
})

function BuildSummary(props) {
  return (
    <div>
      <Text type="headline" gutterBottom>
        {'Summary'}
      </Text>
      <Paper className={props.classes.paper}>
        <WatchTask task={props.fetch}>
          {() => {
            const {
              build: {
                createdAt,
                compareScreenshotBucket: {
                  commit,
                  name,
                },
              },
              screenshotDiffs,
            } = props.fetch.output.data

            const jobStatus = screenshotDiffs
              .every(screenshotDiff => screenshotDiff.jobStatus === 'done') ?
                'done' :
                'progress'

            const validationStatus = screenshotDiffs
              .every(screenshotDiff => screenshotDiff.validationStatus === 'accepted') ?
                'accepted' :
                'unknown'

            return (
              <ul>
                <li>{`Build: ${name}`}</li>
                <li>{`Commit: ${commit.substring(0, 7)}`}</li>
                <li>{`Date: ${new Intl.DateTimeFormat().format(new Date(createdAt))}`}</li>
                <li>{`Job status: ${jobStatus}`}</li>
                <li>{`Validation status: ${validationStatus}`}</li>
              </ul>
            )
          }}
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
