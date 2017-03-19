import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import ItemStatus from 'review/modules/components/ItemStatus'
import BuildActions from 'review/routes/build/BuildActions'

const styleSheet = createStyleSheet('BuildSummary', (theme) => {
  return {
    paper: {
      display: 'flex',
      marginBottom: theme.spacing.unit * 2,
    },
    itemStatusChild: {
      width: '100%',
    },
    list: {
      margin: 0,
      listStyle: 'none',
      padding: theme.spacing.unit,
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
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        Summary
      </Text>
      <Paper className={classes.paper}>
        <WatchTask task={fetch}>
          {() => {
            const build = fetch.output.data.build

            if (!build) {
              return null
            }

            const {
              createdAt,
              status,
              baseScreenshotBucket: {
                commit: baseCommit,
              },
              compareScreenshotBucket: {
                commit: compareCommit,
                branch,
              },
            } = build

            return (
              <ItemStatus status={status}>
                <div className={classes.itemStatusChild}>
                  <Layout container>
                    <Layout item xs={12} sm>
                      <ul className={classes.list}>
                        <li>{`Job status: ${status}`}</li>
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
                      <BuildActions build={build} />
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
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => state.ui.build),
)(BuildSummary)
