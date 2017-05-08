import React from 'react'
import PropTypes from 'prop-types'
import { Link as LinkRouter } from 'react-router'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Grid from 'material-ui/Grid'
import Avatar from 'material-ui/Avatar'
import Paper from 'material-ui/Paper'
import List, { ListItem, ListItemText } from 'material-ui/List'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import AuthorizationNotice from 'review/modules/components/AuthorizationNotice'
import actionTypes from 'review/modules/redux/actionTypes'

const styleSheet = createStyleSheet('Dashboard', () => ({
  paper: {
    display: 'flex',
  },
}))

function Dashboard(props) {
  const {
    classes,
    fetch,
  } = props

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
                  {(data) => {
                    if (data.owners.length === 0) {
                      return (
                        <WatchTaskContainer>
                          <Typography>
                            No organization
                          </Typography>
                        </WatchTaskContainer>
                      )
                    }

                    return (
                      <List>
                        {data.owners.map(({ login, name }) => (
                          <ListItem
                            key={login}
                            button
                            component={LinkRouter}
                            to={`/${login}`}
                          >
                            <Avatar src={`https://github.com/${login}.png?size=80`} />
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
  }),
)(Dashboard)
