import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { Link as LinkRouter } from 'react-router'
import { createStyleSheet } from 'jss-theme-reactor'
import Toolbar from 'material-ui-build-next/src/Toolbar'
import Avatar from 'material-ui-build-next/src/Avatar'
import Layout from 'material-ui-build-next/src/Layout'
import Text from 'material-ui-build-next/src/Text'
import { Menu, MenuItem } from 'material-ui-build-next/src/Menu'
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

class ReviewAppBar extends Component {
  state = {
    open: false,
    anchorEl: undefined,
  };

  handleClickUser = (event) => {
    event.preventDefault()
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  };

  handleRequestClose = () => {
    this.setState({
      open: false,
    })
  };

  render() {
    const {
      classes,
      user,
    } = this.props

    const {
      open,
      anchorEl,
    } = this.state

    return (
      <LayoutAppBar>
        <Toolbar>
          <Text type="title" colorInherit className={classes.title}>
            <Link component={LinkRouter} to="/">
              {'Argos'}
            </Link>
          </Text>
          {user ? (
            <Link
              href="#"
              onClick={this.handleClickUser}
              className={classes.user}
              aria-owns="review-app-bar-menu"
              aria-haspopup="true"
            >
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
          {user ? (
            <Menu
              id="review-app-bar-menu"
              anchorEl={anchorEl}
              open={open}
              onRequestClose={this.handleRequestClose}
            >
              <MenuItem
                component={LinkRouter}
                to={`/profile/${user.githubId}`}
                button={false}
                onClick={this.handleRequestClose}
              >
                {'Accounts'}
              </MenuItem>
              <MenuItem
                component="a"
                href="/auth/logout"
                button={false}
                onClick={this.handleRequestClose}
              >
                {'Sign Out'}
              </MenuItem>
            </Menu>
          ) : null}
        </Toolbar>
      </LayoutAppBar>
    )
  }
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
