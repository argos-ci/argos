import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import Text from 'material-ui/Text'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import BuildScreenshotItem from 'review/routes/build/BuildScreenshotItem'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'

const styleSheet = createStyleSheet('BuildScreenshots', () => {
  return {
  }
})

function BuildScreenshots(props) {
  const {
    fetch,
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        Screenshots
      </Text>
      <WatchTask task={fetch}>
        {() => {
          if (!fetch.output.data.build) {
            return (
              <WatchTaskContainer>
                <Text>
                  Profile not found.
                </Text>
              </WatchTaskContainer>
            )
          }
          const {
            screenshotDiffs,
          } = fetch.output.data.build

          return (
            <Layout container direction="column">
              {screenshotDiffs.map((screenshotDiff) => {
                return (
                  <Layout item key={screenshotDiff.id}>
                    <BuildScreenshotItem screenshotDiff={screenshotDiff} />
                  </Layout>
                )
              })}
            </Layout>
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
