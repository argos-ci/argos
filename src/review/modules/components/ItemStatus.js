// @flow weak

import { cloneElement, PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import classNames from 'classnames'
import withStyles from 'material-ui/styles/withStyles'

function generateBackground(color) {
  return `linear-gradient(to right, ${color} 0, ${color} 10px, #fff 10px, #fff 100%) no-repeat`
}

const styleSheet = createStyleSheet('ItemStatus', theme => ({
  success: {
    background: generateBackground(theme.status.success),
  },
  failure: {
    background: generateBackground(theme.status.failure),
  },
  progress: {
    background: generateBackground(theme.status.progress),
  },
  pending: {
    background: generateBackground(theme.status.progress),
  },
  unknown: {
    background: generateBackground(theme.status.unknown),
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
