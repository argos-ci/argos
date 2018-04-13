import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import AppBar from 'material-ui/AppBar'
import { withStyles } from 'material-ui/styles'

const styles = theme => ({
  root: {
    flex: '0 0 auto',
    color: theme.palette.common.white,
  },
})

function LayoutAppBar(props) {
  const { classes, ...other } = props

  return <AppBar position="static" className={classNames(classes.root)} {...other} />
}

LayoutAppBar.propTypes = {
  classes: PropTypes.object.isRequired,
  style: PropTypes.object,
}

export default withStyles(styles)(LayoutAppBar)
