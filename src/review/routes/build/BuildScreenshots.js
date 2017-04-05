import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import Text from 'material-ui/Text'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import BuildScreenshotItem from 'review/routes/build/BuildScreenshotItem'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'

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

          return (
            <Layout container direction="column">
              {fetch.output.data.build.screenshotDiffs.map(screenshotDiff => (
                <Layout item key={screenshotDiff.id}>
                  <BuildScreenshotItem screenshotDiff={screenshotDiff} />
                </Layout>
              ))}
            </Layout>
          )
        }}
      </WatchTask>
    </div>
  )
}

BuildScreenshots.propTypes = {
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  connect(state => ({
    fetch: state.ui.build.fetch,
    screenshotsBucket: state.data.config.s3.screenshotsBucket,
  })),
)(BuildScreenshots)
