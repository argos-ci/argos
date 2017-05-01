import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import BuildScreenshotItem from 'review/routes/build/BuildScreenshotItem'

function BuildScreenshots(props) {
  const {
    fetch,
  } = props

  return (
    <div>
      <Typography type="headline" component="h3" gutterBottom>
        Screenshots
      </Typography>
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
