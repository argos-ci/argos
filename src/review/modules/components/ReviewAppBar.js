import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Toolbar from 'material-ui/Toolbar'
import Avatar from 'material-ui/Avatar'
import Button from 'material-ui/Button'
import Grid from 'material-ui/Grid'
import Typography from 'material-ui/Typography'
import Menu, { MenuItem } from 'material-ui/Menu'
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
  }

  handleClickUser = event => {
    event.preventDefault()
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    })
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
    })
  }

  render() {
    const { classes, user } = this.props

    const { open, anchorEl } = this.state

    const logged = Boolean(user)

    return (
      <LayoutAppBar>
        <Toolbar>
          <Typography type="title" color="inherit" className={classes.title}>
            <Link to="/">
              {'Argos-CI'}
            </Link>
          </Typography>
          {logged &&
            <Link
              href="#"
              onClick={this.handleClickUser}
              className={classes.user}
              aria-owns="review-app-bar-menu"
              aria-haspopup="true"
            >
              <Grid container align="center">
                <Grid item xs>
                  <Typography color="inherit">
                    {user.name}
                  </Typography>
                </Grid>
                <Grid item>
                  <Avatar src={`https://github.com/${user.login}.png?size=${AVATAR_SIZE}`} />
                </Grid>
              </Grid>
            </Link>}
          {logged &&
            <Menu
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              id="review-app-bar-menu"
              anchorEl={anchorEl}
              open={open}
              onRequestClose={this.handleRequestClose}
            >
              <MenuItem
                component={Link}
                variant="button"
                to="/profile/account"
                button={false}
                onClick={this.handleRequestClose}
              >
                Accounts
              </MenuItem>
              <MenuItem
                component={Link}
                variant="button"
                href="/auth/logout"
                button={false}
                onClick={this.handleRequestClose}
              >
                Sign Out
              </MenuItem>
            </Menu>}
          {!logged &&
            <Button color="inherit" component={Link} variant="button" href="/auth/github-public">
              Login
            </Button>}
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
  }))
)(ReviewAppBar)
