// @flow weak

import React, { PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import classNames from 'classnames'
import AppBar from 'material-ui/AppBar'
import withStyles from 'material-ui/styles/withStyles'
import { white } from 'material-ui/styles/colors'

const styleSheet = createStyleSheet('LayoutAppBar', () => ({
  root: {
    flex: '0 0 auto',
    position: 'static',
    color: white,
  },
}))

function LayoutAppBar(props) {
  const {
    classes,
    ...other
  } = props

  return <AppBar className={classNames(classes.root)} {...other} />
}

LayoutAppBar.propTypes = {
  classes: PropTypes.object.isRequired,
  style: PropTypes.object,
}

export default withStyles(styleSheet)(LayoutAppBar)
