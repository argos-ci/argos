// @flow weak

import { cloneElement, PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import classNames from 'classnames'
import withStyles from 'material-ui/styles/withStyles'

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
    'started',
    'unknown',
  ]),
}

export default withStyles(styleSheet)(ItemStatus)
