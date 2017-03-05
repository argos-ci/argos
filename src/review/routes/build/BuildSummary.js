import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import Button from 'material-ui/Button'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import actionTypes from 'review/modules/redux/actionTypes'
import ItemStatus from 'review/modules/components/ItemStatus'

const styleSheet = createStyleSheet('BuildSummary', (theme) => {
  return {
    paper: {
      marginBottom: theme.spacing.unit * 2,
    },
    list: {
      margin: 0,
      listStyle: 'none',
      padding: theme.spacing.unit,
    },
    validationStatus: {
      margin: `0 ${theme.spacing.unit}px`,
    },
  }
})

function formatShortCommit(commit) {
  return commit.substring(0, 7)
}

export function BuildSummary(props) {
  const {
    classes,
    fetch,
    onValidationClick,
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        {'Summary'}
      </Text>
      <Paper className={classes.paper}>
        <WatchTask task={fetch}>
          {() => {
            const {
              build: {
                createdAt,
                status,
                baseScreenshotBucket: {
                  commit: baseCommit,
                },
                compareScreenshotBucket: {
                  commit: compareCommit,
                  branch,
                },
              },
              screenshotDiffs,
            } = fetch.output.data

            const validationStatus = screenshotDiffs
              .every(screenshotDiff => screenshotDiff.validationStatus === 'accepted') ?
                'accepted' :
                'unknown'

            return (
              <ItemStatus status={status}>
                <div>
                  <Layout container>
                    <Layout item xs={12} sm>
                      <ul className={classes.list}>
                        <li>{`Job status: ${status}`}</li>
                        <li>{`Validation status: ${validationStatus}`}</li>
                        <li>{`Commit: ${formatShortCommit(compareCommit)}`}</li>
                        <li>{`Branch: ${branch}`}</li>
                        <li>
                          {`Compare: ${formatShortCommit(baseCommit)}...${
                            formatShortCommit(compareCommit)}`}
                        </li>
                        <li>{`Date: ${new Intl.DateTimeFormat().format(new Date(createdAt))}`}</li>
                      </ul>
                    </Layout>
                    <Layout item>
                      <Button
                        primary
                        raised
                        onClick={onValidationClick}
                        className={classes.validationStatus}
                      >
                        {'Approve'}
                      </Button>
                    </Layout>
                  </Layout>
                </div>
              </ItemStatus>
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
  onValidationClick: PropTypes.func.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => state.ui.build),
  recompact.withHandlers({
    onValidationClick: props => () => {
      props.dispatch({
        type: actionTypes.BUILD_VALIDATION_CLICK,
        payload: {
          buildId: props.fetch.output.data.build.id,
          validationStatus: 'accepted',
        },
      })
    },
  }),
)(BuildSummary)
