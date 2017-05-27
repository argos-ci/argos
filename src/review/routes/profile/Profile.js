import React from 'react'
import PropTypes from 'prop-types'
import Link from 'modules/components/Link'
import { connect } from 'react-redux'
import recompact from 'modules/recompact'
import Typography from 'material-ui/Typography'
import Paper from 'material-ui/Paper'
import Avatar from 'material-ui/Avatar'
import Grid from 'material-ui/Grid'
import { white } from 'material-ui/styles/colors'
import List, { ListItem, ListItemText } from 'material-ui/List'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'modules/components/ReviewAppBar'
import ReviewFooter from 'modules/components/ReviewFooter'
import actionTypes from 'modules/redux/actionTypes'

const SIZE = 120

const styleSheet = createStyleSheet('Profile', () => ({
  avatar: {
    width: SIZE,
    height: SIZE,
    background: white,
  },
  paper: {
    display: 'flex',
  },
}))

function Profile(props) {
  const { classes, fetch, params: { profileName } } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Grid container gutter={24}>
            <Grid align="center" container item xs={12}>
              <Grid item>
                <Avatar
                  src={`https://github.com/${profileName}.png?size=${SIZE * 2}`}
                  className={classes.avatar}
                />
              </Grid>
              <Grid item>
                <Typography type="display1" component="h2" gutterBottom>
                  <WatchTask task={fetch} onlySuccess>
                    {data => (data.owner ? <span>{data.owner.name}</span> : null)}
                  </WatchTask>
                </Typography>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Paper className={classes.paper}>
                <WatchTask task={fetch}>
                  {data => {
                    if (!data.owner) {
                      return (
                        <WatchTaskContainer>
                          <Typography>
                            Profile not found.
                          </Typography>
                        </WatchTaskContainer>
                      )
                    }

                    if (data.owner.repositories.length === 0) {
                      return (
                        <WatchTaskContainer>
                          <Typography>
                            No repository enabled.
                          </Typography>
                        </WatchTaskContainer>
                      )
                    }

                    return (
                      <List>
                        {data.owner.repositories.map(repository => (
                          <ListItem
                            key={repository.id}
                            button
                            component={Link}
                            variant="button"
                            to={`/${profileName}/${repository.name}`}
                          >
                            <ListItemText primary={repository.name} />
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

Profile.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.profile.fetch,
  })),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.PROFILE_FETCH,
        payload: {
          profileName: this.props.params.profileName,
        },
      })
    },
  })
)(Profile)
