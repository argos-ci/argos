import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Text from 'material-ui/Text'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import BuildScreenshotItem from 'review/routes/build/BuildScreenshotItem'

function BuildScreenshots(props) {
  const {
    fetch,
  } = props

  return (
    <div>
      <Text type="headline" component="h3" gutterBottom>
        Screenshots
      </Text>
      <Layout container direction="column">
        {fetch.output.data.build.screenshotDiffs.map(screenshotDiff => (
          <Layout item key={screenshotDiff.id}>
            <BuildScreenshotItem screenshotDiff={screenshotDiff} />
          </Layout>
        ))}
      </Layout>
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
