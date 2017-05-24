import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import Button from 'material-ui/Button'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import { CONSISTENT, INCONSISTENT } from 'modules/authorizations/authorizationStatuses'

const styleSheet = createStyleSheet('AuthorizationNotice', () => ({
  paper: {
    padding: 16,
  },
}))

function AuthorizationNotice({ authorizationStatus, classes, user }) {
  if (!authorizationStatus || authorizationStatus === CONSISTENT) {
    return null
  }

  return (
    <Paper className={classes.paper}>
      <Grid container align="center" justify="center">
        <Grid item xs={12} sm>
          Your GitHub authentification is outdated, please authenticate to fix it.
        </Grid>
        <Grid item>
          <Button
            accent
            compact
            component={Link}
            variant="button"
            href={user.privateSync ? '/auth/github-private' : '/auth/github-public'}
            raised
          >
            Authenticate to GitHub
          </Button>
        </Grid>
      </Grid>
    </Paper>
  )
}

AuthorizationNotice.propTypes = {
  authorizationStatus: PropTypes.oneOf([CONSISTENT, INCONSISTENT]),
  classes: PropTypes.object.isRequired,
  user: PropTypes.shape({
    privateSync: PropTypes.bool,
  }),
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    user: state.data.user,
    authorizationStatus: state.data.authorizationStatus,
  })),
)(AuthorizationNotice)
