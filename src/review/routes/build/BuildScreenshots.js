import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'

const styleSheet = createStyleSheet('BuildScreenshots', () => {
  return {
    screenshot: {
      width: '100%',
      display: 'block',
    },
  }
})

function getS3Url(s3Id, screenshotsBucket) {
  return `https://s3.amazonaws.com/${screenshotsBucket}/${s3Id}`
}

function BuildScreenshots(props) {
  const {
    classes,
    fetch,
    screenshotsBucket,
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        {'Screenshots'}
      </Text>
      <WatchTask task={fetch}>
        {() => {
          const {
            screenshotDiffs,
          } = fetch.output.data

          return (
            <ul>
              {screenshotDiffs.map((screenshotDiff) => {
                const {
                  id,
                  baseScreenshot,
                  compareScreenshot,
                } = screenshotDiff

                return (
                  <li key={id}>
                    <Text>
                      {compareScreenshot.name}
                    </Text>
                    <Layout container>
                      <Layout item xs={6}>
                        <Paper className={props.classes.paper}>
                          <img
                            className={classes.screenshot}
                            alt={baseScreenshot.name}
                            src={getS3Url(baseScreenshot.s3Id, screenshotsBucket)}
                          />
                        </Paper>
                      </Layout>
                      <Layout item xs={6}>
                        <Paper>
                          <img
                            className={classes.screenshot}
                            alt={compareScreenshot.name}
                            src={getS3Url(compareScreenshot.s3Id, screenshotsBucket)}
                          />
                        </Paper>
                      </Layout>
                    </Layout>
                  </li>
                )
              })}
            </ul>
          )
        }}
      </WatchTask>
    </div>
  )
}

BuildScreenshots.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
  screenshotsBucket: PropTypes.string.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.build.fetch,
    screenshotsBucket: state.data.config.s3.screenshotsBucket,
  })),
)(BuildScreenshots)
