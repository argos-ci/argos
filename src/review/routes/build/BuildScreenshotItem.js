import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import { Card, CardContent } from 'material-ui/Card'
import Layout from 'material-ui/Layout'
import Text from 'material-ui/Text'
import recompact from 'modules/recompact'

function getS3Url(s3Id, screenshotsBucket) {
  return `https://s3.amazonaws.com/${screenshotsBucket}/${s3Id}`
}

const styleSheet = createStyleSheet('BuildScreenshotItem', () => {
  return {
    screenshot: {
      width: '100%',
      display: 'block',
    },
  }
})

function BuildScreenshotItem(props) {
  const {
    classes,
    screenshotsBucket,
    screenshotDiff: {
      s3Id,
      baseScreenshot,
      compareScreenshot,
    },
  } = props

  return (
    <Card>
      <CardContent>
        <Text type="subheading" component="h4">
          {compareScreenshot.name}
        </Text>
      </CardContent>
      <Layout container>
        <Layout item xs={4}>
          <a
            href={getS3Url(baseScreenshot.s3Id, screenshotsBucket)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className={classes.screenshot}
              alt={baseScreenshot.name}
              src={getS3Url(baseScreenshot.s3Id, screenshotsBucket)}
            />
          </a>
        </Layout>
        <Layout item xs={4}>
          <a
            href={getS3Url(compareScreenshot.s3Id, screenshotsBucket)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              className={classes.screenshot}
              alt={compareScreenshot.name}
              src={getS3Url(compareScreenshot.s3Id, screenshotsBucket)}
            />
          </a>
        </Layout>
        <Layout item xs={4}>
          {s3Id && (
            <a
              href={getS3Url(s3Id, screenshotsBucket)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className={classes.screenshot}
                alt="diff"
                src={getS3Url(s3Id, screenshotsBucket)}
              />
            </a>
          )}
        </Layout>
      </Layout>
    </Card>
  )
}

BuildScreenshotItem.propTypes = {
  classes: PropTypes.object.isRequired,
  screenshotDiff: PropTypes.shape({
    s3id: PropTypes.string,
    baseScreenshot: PropTypes.object.isRequired,
    compareScreenshot: PropTypes.object.isRequired,
  }).isRequired,
  screenshotsBucket: PropTypes.string.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    screenshotsBucket: state.data.config.s3.screenshotsBucket,
  })),
)(BuildScreenshotItem)
