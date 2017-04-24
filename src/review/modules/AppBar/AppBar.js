import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Link as LinkRouter } from 'react-router'
import Toolbar from 'material-ui/Toolbar'
import Avatar from 'material-ui/Avatar'
import Layout from 'material-ui/Layout'
import Text from 'material-ui/Text'
import { Menu, MenuItem } from 'material-ui/Menu'
import { withStyles, createStyleSheet } from 'material-ui/styles'
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

const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1
const AVATAR_SIZE = Math.round(DEVICE_PIXEL_RATIO * 40)

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
              Argos
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
                  <Avatar src={`https://github.com/${user.login}.png?size=${AVATAR_SIZE}`} />
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
                to="/profile/account"
                button={false}
                onClick={this.handleRequestClose}
              >
                Accounts
              </MenuItem>
              <MenuItem
                component="a"
                href="/auth/logout"
                button={false}
                onClick={this.handleRequestClose}
              >
                Sign Out
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
    login: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }),
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    user: state.data.user,
  })),
)(ReviewAppBar)
