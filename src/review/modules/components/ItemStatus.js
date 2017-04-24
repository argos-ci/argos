// @flow weak

import { cloneElement } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { withStyles, createStyleSheet } from 'material-ui/styles'

const styleSheet = createStyleSheet('ItemStatus', theme => ({
  success: {
    borderLeft: `10px solid ${theme.status.success}`,
  },
  failure: {
    borderLeft: `10px solid ${theme.status.failure}`,
  },
  progress: {
    borderLeft: `10px solid ${theme.status.progress}`,
  },
  pending: {
    borderLeft: `10px solid ${theme.status.progress}`,
  },
  unknown: {
    borderLeft: `10px solid ${theme.status.unknown}`,
  },
}))

function ItemStatus(props) {
  const {
    children,
    classes,
    className,
    status,
    ...other
  } = props

  return cloneElement(children, {
    className: classNames(className, children.props.className, {
      [classes[status]]: true,
    }),
    ...other,
  })
}

ItemStatus.propTypes = {
  children: PropTypes.element.isRequired,
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  status: PropTypes.oneOf([
    'success',
    'failure',
    'progress',
    'pending',
    'unknown',
  ]),
}

export default withStyles(styleSheet)(ItemStatus)
