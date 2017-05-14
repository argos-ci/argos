import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import TextField from 'material-ui/TextField'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'

const styleSheet = createStyleSheet('Settings', theme => ({
  paper: {
    padding: theme.spacing.unit * 2,
  },
  textField: {
    margin: `${theme.spacing.unit * 2}px 0 0`,
  },
}))

function Settings(props) {
  const {
    classes,
    fetch,
    params: {
      profileName,
      repositoryName,
    },
  } = props
  const { repository } = fetch.output.data

  return (
    <div>
      <Typography type="headline" gutterBottom>
        Settings
      </Typography>
      <Paper className={classes.paper}>
        <Typography type="title" gutterBottom>
          Environment Variables
        </Typography>
        <Typography type="subheading">
          {'To send data to Argos-ci you will need to configure a '}
          <Link
            href="https://github.com/argos-ci/argos-cli"
            target="_blank"
            variant="primary"
          >
            CLI
          </Link>
          {' with a client key (usually referred to as the ARGOS_TOKEN value).'}
          <br />
          {'ARGOS_TOKEN is a project-specific, it should be kept secret.'}
          <br />
          {`
For more information on integrating Sentry with your application take a look at our
          `}
          <Link to={`/${profileName}/${repositoryName}/getting-started`} variant="primary">
            documentation.
          </Link>
        </Typography>
        <TextField
          inputProps={{
            readOnly: true,
          }}
          className={classes.textField}
          id="ARGOS_TOKEN"
          label="ARGOS_TOKEN"
          value={repository.token}
        />
      </Paper>
    </div>
  )
}

Settings.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
    repositoryName: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.repository.fetch,
  })),
)(Settings)
