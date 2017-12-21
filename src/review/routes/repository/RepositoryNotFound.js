import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Link from 'modules/components/Link'
import Button from 'material-ui/Button'
import Grid from 'material-ui/Grid'

function RepositoryNotFound({ user }) {
  if (!user) return <Typography>Repository not found, try to login.</Typography>
  if (!user.privateSync) {
    return (
      <Grid item>
        <Typography component="p" align="center" gutterBottom>
          Repository not found.
        </Typography>
        <Button
          color="accent"
          dense
          component={Link}
          variant="button"
          href="/auth/github-private"
          raised
        >
          Grant access to private repositories
        </Button>
      </Grid>
    )
  }

  return <Typography>Repository not found.</Typography>
}

RepositoryNotFound.propTypes = {
  user: PropTypes.shape({
    privateSync: PropTypes.bool,
  }),
}

export default connect(state => ({ user: state.data.user }))(RepositoryNotFound)
