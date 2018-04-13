import React from 'react'
import PropTypes from 'prop-types'
import { withStyles } from 'material-ui/styles'

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
}

function ViewContainer(props) {
  const { children, classes } = props

  return <div className={classes.root}>{children}</div>
}

ViewContainer.propTypes = {
  children: PropTypes.node.isRequired,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(ViewContainer)
