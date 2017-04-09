import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
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
      <Layout container align="center" justify="center">
        <Layout item xs={12} sm>
          Your GitHub authentification is outdated, please authenticate to fix it.
        </Layout>
        <Layout item>
          <Button
            accent
            compact
            component={Link}
            href={user.privateSync ? '/auth/github-private' : '/auth/github-public'}
            raised
          >
            Authenticate to GitHub
          </Button>
        </Layout>
      </Layout>
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
