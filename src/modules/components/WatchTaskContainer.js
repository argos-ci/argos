/* eslint-disable react/no-multi-comp */
import React, { PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui-build-next/src/styles/withStyles'
import Layout from 'material-ui-build-next/src/Layout'

const styleSheet = createStyleSheet('WatchTaskContainer', () => ({
  root: {
    padding: 8,
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
