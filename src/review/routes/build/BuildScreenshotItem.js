import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import classnames from 'classnames'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui/styles/withStyles'
import { Paper } from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import Text from 'material-ui/Text'
import IconButton from 'material-ui/IconButton'
import Collapse from 'material-ui/transitions/Collapse'
import recompact from 'modules/recompact'
import ItemStatus from 'review/modules/components/ItemStatus'

function getS3Url(s3Id, screenshotsBucket) {
  return `https://s3.amazonaws.com/${screenshotsBucket}/${s3Id}`
}

const styleSheet = createStyleSheet('BuildScreenshotItem', (theme) => {
  return {
    name: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    screenshot: {
      width: '100%',
      display: 'block',
    },
    expand: {
      transform: 'rotate(0deg)',
      transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest,
      }),
    },
    expandIn: {
      transform: 'rotate(180deg)',
    },
    flexGrow: {
      flexGrow: 1,
    },
    cardContent: {
      padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 2}px 0 ${
        (theme.spacing.unit * 2) + 10}px`,
    },
    cardActions: {
      display: 'flex',
    },
  }
})

function BuildScreenshotItem(props) {
  const {
    classes,
    expandIn,
    onClickExpand,
    screenshotsBucket,
    screenshotDiff: {
      s3Id,
      score,
      baseScreenshot,
      compareScreenshot,
    },
  } = props

  return (
    <ItemStatus status={score > 0 ? 'unknown' : 'success'}>
      <Paper>
        <div className={classes.cardContent}>
          <Text type="subheading" component="h4" className={classes.name}>
            {compareScreenshot.name}
          </Text>
        </div>
        <div className={classes.cardActions}>
          <div className={classes.flexGrow} />
          <IconButton
            className={classnames(classes.expand, {
              [classes.expandIn]: expandIn,
            })}
            onClick={onClickExpand}
          >
            expand_more
          </IconButton>
        </div>
        <Collapse in={expandIn} transitionDuration="auto" unmountOnExit>
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
        </Collapse>
      </Paper>
    </ItemStatus>
  )
}

BuildScreenshotItem.propTypes = {
  classes: PropTypes.object.isRequired,
  expandIn: PropTypes.bool.isRequired,
  onClickExpand: PropTypes.func.isRequired,
  screenshotDiff: PropTypes.shape({
    s3id: PropTypes.string,
    score: PropTypes.number,
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
  recompact.withState('expandIn', 'onExpandIn', props => (
    props.screenshotDiff.score > 0
  )),
  recompact.withHandlers(() => ({
    onClickExpand: props => () => {
      props.onExpandIn(!props.expandIn)
    },
  })),
)(BuildScreenshotItem)
