import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import TextField from 'material-ui/TextField'
import { withStyles } from 'material-ui/styles'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'

const styles = theme => ({
  paper: {
    display: 'flex',
  },
  padding: {
    padding: theme.spacing.unit * 2,
  },
  textField: {
    margin: `${theme.spacing.unit * 2}px 0 0`,
    width: '100%',
  },
})

function Settings(props) {
  const {
    classes,
    repository,
    params: { profileName, repositoryName },
  } = props

  if (!repository.authorization) {
    return (
      <Paper className={classes.paper}>
        <WatchTaskContainer>
          <Typography>{"You don't have enough access right to see that content."}</Typography>
        </WatchTaskContainer>
      </Paper>
    )
  }

  return (
    <div>
      <Typography variant="headline" gutterBottom>
        Settings
      </Typography>
      <Paper className={classes.padding}>
        <Typography variant="title" gutterBottom>
          Environment Variables
        </Typography>
        <Typography variant="subheading">
          {'To send data to Argos-ci you will need to configure a '}
          <Link href="https://github.com/argos-ci/argos-cli" target="_blank" variant="primary">
            CLI
          </Link>
          {' with a client key (usually referred to as the ARGOS_TOKEN value).'}
          <br />
          {'ARGOS_TOKEN is a project-specific, it should be kept secret.'}
          <br />
          {`
For more information on integrating Argos CI with your application take a look at our
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
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
    repositoryName: PropTypes.string.isRequired,
  }).isRequired,
  repository: PropTypes.shape({
    authorization: PropTypes.bool.isRequired,
    token: PropTypes.string,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styles),
  connect(state => ({
    repository: state.ui.repository.fetch.output.data.repository,
  }))
)(Settings)
