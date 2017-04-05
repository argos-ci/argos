import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import { connect } from 'react-redux'
import recompact from 'modules/recompact'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import Avatar from 'material-ui/Avatar'
import Layout from 'material-ui/Layout'
import { white } from 'material-ui/styles/colors'
import {
  List,
  ListItem,
  ListItemText,
} from 'material-ui/List'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'

const styleSheet = createStyleSheet('Profile', () => ({
  avatar: {
    width: 120,
    height: 120,
    background: white,
  },
  paper: {
    display: 'flex',
  },
}))

function Profile(props) {
  const {
    classes,
    fetch,
    params: {
      profileName,
    },
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Layout container gutter={24}>
            <Layout
              align="center"
              container
              item
              xs={12}
            >
              <Layout item>
                <Avatar
                  src={`https://github.com/${profileName}.png?size=300`}
                  className={classes.avatar}
                />
              </Layout>
              <Layout item>
                <Text type="display1" component="h2" gutterBottom>
                  {
                    fetch.state === 'SUCCESS' && fetch.output.data.owner ?
                      fetch.output.data.owner.name :
                      null
                  }
                </Text>
              </Layout>
            </Layout>
            <Layout item xs={12}>
              <Paper className={classes.paper}>
                <WatchTask task={fetch}>
                  {() => {
                    if (!fetch.output.data.owner) {
                      return (
                        <WatchTaskContainer>
                          <Text>
                            Profile not found.
                          </Text>
                        </WatchTaskContainer>
                      )
                    }

                    const { repositories } = fetch.output.data.owner

                    if (repositories.length === 0) {
                      return (
                        <WatchTaskContainer>
                          <Text>
                            No repository enabled.
                          </Text>
                        </WatchTaskContainer>
                      )
                    }

                    return (
                      <List>
                        {repositories.map(repository => (
                          <ListItem
                            key={repository.id}
                            button
                            component={LinkRouter}
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
            </Layout>
          </Layout>
        </LayoutBody>
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
  connect(state => state.ui.profile),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.PROFILE_FETCH,
        payload: {
          profileName: this.props.params.profileName,
        },
      })
    },
  }),
)(Profile)
