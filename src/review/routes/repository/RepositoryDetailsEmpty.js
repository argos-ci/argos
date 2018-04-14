import React from 'react'
import { PropTypes } from 'prop-types'
import { withRouter } from 'react-router'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import Grid from 'material-ui/Grid'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import { withStyles } from 'material-ui/styles'
import Beast from 'review/routes/repository/Beast'

const styles = theme => ({
  root: {
    minHeight: 400,
  },
  instructions: {
    margin: `${theme.spacing.unit * 3}px 0`,
  },
  body: {
    margin: theme.spacing.unit * 2,
  },
  beast: {
    fill: theme.brandColor,
  },
})

function RepositoryDetailsEmpty(props) {
  const { classes, location, repository } = props

  return (
    <Grid container alignItems="center" className={classes.root}>
      <Grid item xs={12} sm={4}>
        <Grid container justify="center">
          <Beast width="100" height="100" className={classes.beast} />
        </Grid>
      </Grid>
      <Grid item xs={12} sm={8}>
        <div className={classes.body}>
          <Typography variant="title" gutterBottom>
            {'Waiting for screenshots…'}
          </Typography>
          <Typography>
            {'Our screenshot beast is waiting to scan your first screenshots.'}
          </Typography>
          <br />
          <Button
            component={props => (
              <Link {...props} variant="button" to={`${location.pathname}/getting-started`} />
            )}
            variant="raised"
            color="secondary"
            className={classes.instructions}
          >
            {'Installation Instructions'}
          </Button>
          <br />
          <Typography
            component={props => (
              <Link
                {...props}
                to={`${location.pathname}/builds/${repository.sampleBuildId}?sample`}
                variant="primary"
              />
            )}
          >
            {'Or see a sample build'}
          </Typography>
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

export default recompact.compose(withStyles(styles), withRouter)(RepositoryDetailsEmpty)
