import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import recompact from 'modules/recompact'
import BuildScreenshotItem from 'review/routes/build/BuildScreenshotItem'

function BuildScreenshots(props) {
  const { fetch } = props

  return (
    <div>
      <Typography variant="headline" component="h3" gutterBottom>
        Screenshots
      </Typography>
      <Grid container direction="column">
        {fetch.output.data.build.screenshotDiffs.map(screenshotDiff => (
          <Grid item key={screenshotDiff.id}>
            <BuildScreenshotItem screenshotDiff={screenshotDiff} />
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

BuildScreenshots.propTypes = {
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  connect(state => ({
    fetch: state.ui.build.fetch,
  }))
)(BuildScreenshots)
