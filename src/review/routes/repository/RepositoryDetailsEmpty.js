import React from 'react'
import { PropTypes } from 'prop-types'
import { Link as LinkRouter, withRouter } from 'react-router'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import Grid from 'material-ui/Grid'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import beast from 'review/routes/repository/beast.svg'

const styleSheet = createStyleSheet('RepositoryDetailsEmpty', theme => ({
  root: {
    minHeight: 400,
  },
  instructions: {
    margin: `${theme.spacing.unit * 3}px 0`,
  },
  body: {
    margin: theme.spacing.unit * 2,
  },
}))

function RepositoryDetailsEmpty(props) {
  const {
    classes,
    location,
    repository,
  } = props

  return (
    <Grid container align="center" className={classes.root}>
      <Grid item xs={12} sm={4}>
        <Grid container justify="center">
          <img src={beast} alt="beast" width="100" height="100" />
        </Grid>
      </Grid>
      <Grid item xs={12} sm={8}>
        <div className={classes.body}>
          <Typography type="title" gutterBottom>
            {'Waiting for screenshots…'}
          </Typography>
          {'Our screenshot beast is waiting to scan your first screenshots.'}
          <br />
          <Button
            component={LinkRouter}
            to={`${location.pathname}/getting-started`}
            raised
            accent
            className={classes.instructions}
          >
            {'Installation Instructions'}
          </Button>
          <br />
          <Link
            component={LinkRouter}
            to={`${location.pathname}/builds/${repository.sampleBuildId}?sample`}
            variant="primary"
          >
            {'Or see a sample build'}
          </Link>
        </div>
      </Grid>
    </Grid>
  )
}

RepositoryDetailsEmpty.propTypes = {
  classes: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  repository: PropTypes.shape({
    sampleBuildId: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  withRouter,
)(RepositoryDetailsEmpty)
