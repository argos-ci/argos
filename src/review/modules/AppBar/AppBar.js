import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { Link as LinkRouter } from 'react-router'
import { createStyleSheet } from 'jss-theme-reactor'
import Toolbar from 'material-ui-build-next/src/Toolbar'
import Avatar from 'material-ui-build-next/src/Avatar'
import Layout from 'material-ui-build-next/src/Layout'
import Text from 'material-ui-build-next/src/Text'
import withStyles from 'material-ui-build-next/src/styles/withStyles'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import LayoutAppBar from 'modules/components/LayoutAppBar'

const styleSheet = createStyleSheet('ReviewAppBar', () => ({
  title: {
    flex: '1 1 100%',
  },
  user: {
    flexShrink: 0,
  },
}))

function ReviewAppBar(props) {
  const {
    classes,
    user,
  } = props

  return (
    <LayoutAppBar>
      <Toolbar>
        <Text type="title" colorInherit className={classes.title}>
          <Link component={LinkRouter} to="/">
            {'Argos'}
          </Link>
        </Text>
        {user ? (
          <Link component={LinkRouter} to={`/profile/${user.githubId}`} className={classes.user}>
            <Layout container align="center">
              <Layout item>
                <Text colorInherit>
                  {user.name}
                </Text>
              </Layout>
              <Layout item>
                <Avatar src={`https://avatars.githubusercontent.com/u/${user.githubId}`} />
              </Layout>
            </Layout>
          </Link>
        ) : null}
      </Toolbar>
    </LayoutAppBar>
  )
}

ReviewAppBar.propTypes = {
  classes: PropTypes.object.isRequired,
  user: PropTypes.shape({
    githubId: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  }),
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => state.data),
)(ReviewAppBar)
