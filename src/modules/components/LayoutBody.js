// @flow weak

import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { withStyles, createStyleSheet } from 'material-ui/styles'

const styleSheet = createStyleSheet('LayoutBody', theme => ({
  rootMargin: {
    margin: 8 * 3,
  },
  rootBottom: {
    marginBottom: 8 * 4,
  },
  rootResponsive: {
    [theme.breakpoints.up('sm')]: {
      width: 'auto',
      marginLeft: 40,
      marginRight: 40,
    },
    [theme.breakpoints.up('md')]: {
      width: 880,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    '@media (min-width: 1260px)': {
      width: '66.66%',
    },
    '@media (min-width: 1800px)': {
      width: 1200,
    },
  },
  rootFullHeight: {
    height: '100%',
  },
}))

function LayoutBody(props) {
  const {
    bottom,
    children,
    classes,
    className,
    fullHeight,
    fullWidth,
    margin,
    style,
    ...other
  } = props

  return (
    <div
      className={classNames(classes.root, {
        [classes.rootResponsive]: !fullWidth,
        [classes.rootFullHeight]: fullHeight,
        [classes.rootMargin]: margin,
        [classes.rootBottom]: bottom,
      }, className)}
      style={style}
      {...other}
    >
      {children}
    </div>
  )
}

LayoutBody.propTypes = {
  bottom: PropTypes.bool,
  children: PropTypes.node,
  classes: PropTypes.object.isRequired,
  className: PropTypes.string,
  fullHeight: PropTypes.bool,
  fullWidth: PropTypes.bool,
  margin: PropTypes.bool,
  style: PropTypes.object,
}

LayoutBody.defaultProps = {
  bottom: true,
  fullHeight: false,
  fullWidth: false,
  margin: false,
}

export default withStyles(styleSheet)(LayoutBody)
