import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import classnames from 'classnames'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import Typography from 'material-ui/Typography'
import IconButton from 'material-ui/IconButton'
import Collapse from 'material-ui/transitions/Collapse'
import recompact from 'modules/recompact'
import ItemStatus from 'modules/components/ItemStatus'

function getS3Url(s3Id, screenshotsBucket) {
  return `https://s3.amazonaws.com/${screenshotsBucket}/${s3Id}`
}

const styleSheet = createStyleSheet('BuildScreenshotItem', theme => ({
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
    padding: `${theme.spacing.unit * 2}px ${theme.spacing.unit * 2}px 0 ${theme.spacing.unit *
      2}px`,
  },
  cardActions: {
    display: 'flex',
  },
}))

function BuildScreenshotItem(props) {
  const {
    classes,
    expandIn,
    onClickExpand,
    screenshotsBucket,
    screenshotDiff: { s3Id, score, jobStatus, baseScreenshot, compareScreenshot },
  } = props

  let status = jobStatus

  if (jobStatus === 'complete') {
    status = score === 0 ? 'success' : 'unknown'
  }

  return (
    <ItemStatus status={status}>
      <Paper>
        <div className={classes.cardContent}>
          <Typography type="subheading" component="h4" className={classes.name}>
            {compareScreenshot.name}
          </Typography>
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
          <Grid container>
            <Grid item xs={4}>
              {baseScreenshot
                ? <a
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
                : null}
            </Grid>
            <Grid item xs={4}>
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
            </Grid>
            <Grid item xs={4}>
              {s3Id &&
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
                </a>}
            </Grid>
          </Grid>
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
    jobStatus: PropTypes.string.isRequired,
    baseScreenshot: PropTypes.object,
    compareScreenshot: PropTypes.object.isRequired,
  }).isRequired,
  screenshotsBucket: PropTypes.string.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    screenshotsBucket: state.data.config.s3.screenshotsBucket,
  })),
  recompact.withState('expandIn', 'onExpandIn', props => props.screenshotDiff.score !== 0),
  recompact.withHandlers(() => ({
    onClickExpand: props => () => {
      props.onExpandIn(!props.expandIn)
    },
  }))
)(BuildScreenshotItem)
