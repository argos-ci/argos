/* eslint-disable react/no-multi-comp */
import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Grid from 'material-ui/Grid'

const styleSheet = createStyleSheet('WatchTaskContainer', theme => ({
  root: {
    padding: theme.spacing.unit,
    minHeight: 76,
  },
}))

function WatchTaskContainer(props) {
  return (
    <Grid container justify="center" className={props.classes.root} align="center">
      <Grid item>
        {props.children}
      </Grid>
    </Grid>
  )
}

WatchTaskContainer.propTypes = {
  children: PropTypes.node.isRequired,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(WatchTaskContainer)
