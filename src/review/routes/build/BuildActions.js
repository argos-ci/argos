import React, { PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import { connect } from 'react-redux'
import withStyles from 'material-ui/styles/withStyles'
import Button from 'material-ui/Button'
import recompact from 'modules/recompact'
import { VALIDATION_STATUS } from 'server/models/constant'
import actionTypes from 'review/modules/redux/actionTypes'

const styleSheet = createStyleSheet('BuildActions', (theme) => {
  return {
    validationStatus: {
      margin: `0 ${theme.spacing.unit}px`,
    },
  }
})

export function BuildActions(props) {
  const {
    build,
    classes,
    onValidationClick,
  } = props

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
    <Button
      primary
      raised
      onClick={onValidationClick}
      className={classes.validationStatus}
    >
      {actionMessage}
    </Button>
  )
}

BuildActions.propTypes = {
  build: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  onValidationClick: PropTypes.func.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(),
  recompact.withHandlers({
    onValidationClick: props => () => {
      props.dispatch({
        type: actionTypes.BUILD_VALIDATION_CLICK,
        payload: {
          buildId: props.build.id,
          validationStatus: props.build.status === 'failure' ?
            VALIDATION_STATUS.accepted :
            VALIDATION_STATUS.rejected,
        },
      })
    },
  }),
)(BuildActions)
