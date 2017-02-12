import React, { Component, PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import { connect } from 'react-redux'
import Text from 'material-ui/Text'
import Paper from 'material-ui/Paper'
import {
  List,
  ListItem,
  ListItemText,
} from 'material-ui/List'
import Link from 'modules/components/Link'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'

class Profile extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    fetch: PropTypes.object.isRequired,
    params: PropTypes.shape({
      profileName: PropTypes.string.isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.props.dispatch({
      type: actionTypes.PROFILE_FETCH,
      payload: {
        profileName: this.props.params.profileName,
      },
    })
  }

  render() {
    const {
      fetch,
      params: {
        profileName,
      },
    } = this.props

    return (
      <ViewContainer>
        <ReviewAppBar />
        <ScrollView>
          <LayoutBody margin>
            <Text type="display1" component="h2" gutterBottom>
              <Link component={LinkRouter} to={`/${profileName}`}>
                {profileName}
              </Link>
            </Text>
            <Paper>
              <WatchTask task={fetch}>
                {() => {
                  const {
                    repositories,
                  } = this.props.fetch.output.data

                  if (repositories.length === 0) {
                    return (
                      <WatchTaskContainer>
                        <Text>
                          {'No repository'}
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
          </LayoutBody>
        </ScrollView>
      </ViewContainer>
    )
  }
}

export default connect(state => state.ui.profile)(Profile)
