import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import Avatar from 'material-ui/Avatar'
import Paper from 'material-ui/Paper'
import List, { ListItem, ListItemText } from 'material-ui/List'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import Link from 'modules/components/Link'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'modules/components/ReviewAppBar'
import ReviewFooter from 'modules/components/ReviewFooter'
import AuthorizationNotice from 'modules/components/AuthorizationNotice'
import actionTypes from 'modules/redux/actionTypes'

const styleSheet = createStyleSheet('Dashboard', theme => ({
  avatar: {
    backgroundColor: theme.palette.background.default,
  },
  paper: {
    display: 'flex',
  },
}))

function Dashboard(props) {
  const { classes, fetch } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <AuthorizationNotice />
      <ScrollView>
        <LayoutBody margin>
          <Grid container gutter={24}>
            <Grid item xs={12}>
              <Typography type="display1" component="h2">
                Dashboard
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                <WatchTask task={fetch}>
                  {data => {
                    if (data.owners.length === 0) {
                      return (
                        <WatchTaskContainer>
                          <Typography>No owners</Typography>
                        </WatchTaskContainer>
                      )
                    }

                    return (
                      <List>
                        {data.owners.map(({ login, name }) =>
                          <ListItem
                            key={login}
                            button
                            component={Link}
                            variant="button"
                            to={`/${login}`}
                          >
                            <Avatar
                              className={classes.avatar}
                              src={`https://github.com/${login}.png?size=80`}
                            />
                            <ListItemText primary={name || login} />
                          </ListItem>
                        )}
                      </List>
                    )
                  }}
                </WatchTask>
              </Paper>
            </Grid>
          </Grid>
        </LayoutBody>
        <ReviewFooter />
      </ScrollView>
    </ViewContainer>
  )
}

Dashboard.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.dashboard.fetch,
  })),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.DASHBOARD_FETCH,
      })
    },
  })
)(Dashboard)
