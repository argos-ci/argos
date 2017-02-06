import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { Link as LinkRouter } from 'react-router'
import {
  List,
  ListItem,
  ListItemText,
} from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Text from 'material-ui/Text'
import Link from 'modules/components/Link'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import actionTypes from 'review/modules/redux/actionTypes'

class RepositoryDetails extends Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    fetch: PropTypes.object.isRequired,
    params: PropTypes.shape({
      profileName: PropTypes.string.isRequired,
      repositoryName: PropTypes.string.isRequired,
    }).isRequired,
  }

  componentDidMount() {
    this.props.dispatch({
      type: actionTypes.REPOSITORY_DETAILS_FETCH,
      payload: {
        profileName: this.props.params.profileName,
        repositoryName: this.props.params.repositoryName,
      },
    })
  }

  render() {
    const {
      fetch,
      params: {
        profileName,
        repositoryName,
      },
    } = this.props

    return (
      <div>
        <Link component={LinkRouter} to={`/${profileName}/${repositoryName}/settings`}>
          {'Settings'}
        </Link>
        <br />
        <br />
        <Paper>
          <WatchTask task={fetch}>
            {() => {
              const {
                builds,
              } = this.props.fetch.output.data

              if (builds.length === 0) {
                return (
                  <WatchTaskContainer>
                    <Text>
                      {'No build'}
                    </Text>
                  </WatchTaskContainer>
                )
              }

              return (
                <List>
                  {builds.map(build => (
                    <ListItem
                      key={build.id}
                      button
                      component={LinkRouter}
                      to={`/${profileName}/${repositoryName}/builds/${build.id}`}
                    >
                      <ListItemText
                        primary={`build ${build.id}`}
                        secondary={new Intl.DateTimeFormat().format(new Date(build.createdAt))}
                      />
                    </ListItem>
                  ))}
                </List>
              )
            }}
          </WatchTask>
        </Paper>
      </div>
    )
  }
}

export default connect(state => state.ui.repositoryDetails)(RepositoryDetails)
