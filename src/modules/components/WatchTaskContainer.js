/* eslint-disable react/no-multi-comp */
import React, { PropTypes } from 'react'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Layout from 'material-ui/Layout'

const styleSheet = createStyleSheet('WatchTaskContainer', theme => ({
  root: {
    padding: theme.spacing.unit,
  },
}))

function WatchTaskContainer(props) {
  return (
    <Layout container justify="center" className={props.classes.root}>
      <Layout item>
        {props.children}
      </Layout>
    </Layout>
  )
}

WatchTaskContainer.propTypes = {
  children: PropTypes.node.isRequired,
  classes: PropTypes.object.isRequired,
}

export default withStyles(styleSheet)(WatchTaskContainer)
