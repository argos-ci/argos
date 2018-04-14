import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import Avatar from 'material-ui/Avatar'
import Paper from 'material-ui/Paper'
import List, { ListItem, ListItemText } from 'material-ui/List'
import { withStyles } from 'material-ui/styles'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import Link from 'modules/components/Link'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import actionTypes from 'modules/redux/actionTypes'
import ReviewFooter from 'review/modules/components/ReviewFooter'
import AuthorizationNotice from 'review/modules/components/AuthorizationNotice'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'

const styles = theme => ({
  avatar: {
    backgroundColor: theme.palette.background.default,
  },
})

function Dashboard(props) {
  const { classes, fetch } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <AuthorizationNotice />
      <ScrollView>
        <LayoutBody margin marginBottom>
          <Grid container spacing={24}>
            <Grid item xs={12}>
              <Typography variant="display1" component="h2">
                Dashboard
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Paper>
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
                        {data.owners.map(({ login, name }) => (
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
                        ))}
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
  withStyles(styles),
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
