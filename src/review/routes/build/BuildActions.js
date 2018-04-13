import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withStyles } from 'material-ui/styles'
import Button from 'material-ui/Button'
import recompact from 'modules/recompact'
import { VALIDATION_STATUS } from 'server/constants'
import actionTypes from 'modules/redux/actionTypes'

const styles = theme => ({
  status: {
    margin: theme.spacing.unit,
  },
})

function BuildActions(props) {
  const { build, classes, onValidationClick } = props

  if (!build.repository.authorization) {
    return null
  }

  let actionMessage

  switch (build.status) {
    case 'success':
      actionMessage = 'Reject'
      break
    case 'failure':
      actionMessage = 'Approve'
      break
    default:
      return null
  }

  return (
    <Button color="secondary" raised onClick={onValidationClick} className={classes.status}>
      {actionMessage}
    </Button>
  )
}

BuildActions.propTypes = {
  build: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    repository: PropTypes.shape({
      authorization: PropTypes.bool.isRequired,
    }).isRequired,
  }).isRequired,
  classes: PropTypes.object.isRequired,
  onValidationClick: PropTypes.func.isRequired,
}

export default recompact.compose(
  withStyles(styles),
  connect(),
  recompact.withHandlers({
    onValidationClick: props => () => {
      props.dispatch({
        type: actionTypes.BUILD_VALIDATION_CLICK,
        payload: {
          buildId: props.build.id,
          validationStatus:
            props.build.status === 'failure'
              ? VALIDATION_STATUS.accepted
              : VALIDATION_STATUS.rejected,
        },
      })
    },
  })
)(BuildActions)
