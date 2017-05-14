import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import Link from 'modules/components/Link'
import Button from 'material-ui/Button'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import MarkdownElement from 'modules/components/MarkdownElement'
import gettingStarted from './getting-started.md'

const styleSheet = createStyleSheet('GettingStarted', theme => ({
  paper: {
    overflow: 'auto',
  },
  button: {
    marginLeft: theme.spacing.unit * 2,
    marginBottom: theme.spacing.unit * 2,
  },
}))

function GettingStarted(props) {
  const {
    classes,
    fetch,
    params: {
      profileName,
      repositoryName,
    },
  } = props

  const { repository } = fetch.output.data
  const text = gettingStarted.replace(/__ARGOS_TOKEN__/g, repository.token)

  return (
    <div>
      <Typography type="headline" gutterBottom>
        Getting started
      </Typography>
      <Paper className={classes.paper}>
        <MarkdownElement text={text} disableAnchor />
        <Button
          component={Link}
          to={`/${profileName}/${repositoryName}`}
          raised
          accent
          className={classes.button}
        >
          {'Got it! Go to the Build Stream'}
        </Button>
      </Paper>
    </div>
  )
}

GettingStarted.propTypes = {
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
)(GettingStarted)
