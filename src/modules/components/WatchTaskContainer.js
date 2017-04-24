/* eslint-disable react/no-multi-comp */
import React from 'react'
import PropTypes from 'prop-types'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import Layout from 'material-ui/Layout'

const styleSheet = createStyleSheet('WatchTaskContainer', theme => ({
  root: {
    padding: theme.spacing.unit,
    minHeight: 76,
  },
}))

function WatchTaskContainer(props) {
  return (
    <Layout
      container
      justify="center"
      className={props.classes.root}
      align="center"
    >
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
