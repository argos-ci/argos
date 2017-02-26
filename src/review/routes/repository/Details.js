import React, { PropTypes } from 'react'
import recompact from 'modules/recompact'
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

function RepositoryDetails(props) {
  const {
    fetch,
    params: {
      profileName,
      repositoryName,
    },
  } = props

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
              edges,
            } = fetch.output.data.builds

            if (edges.length === 0) {
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
                {edges.map(build => (
                  <ListItem
                    key={build.id}
                    button
                    component={LinkRouter}
                    to={`/${profileName}/${repositoryName}/builds/${build.id}`}
                  >
                    <ListItemText
                      primary={`build ${build.number}`}
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

RepositoryDetails.propTypes = {
  dispatch: PropTypes.func.isRequired,
  fetch: PropTypes.shape({
    output: PropTypes.shape({
      data: PropTypes.shape({
        builds: PropTypes.shape({
          edges: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string.isRequired,
            number: PropTypes.number.isRequired,
            createdAt: PropTypes.string.isRequired,
          })),
        }),
      }),
    }),
  }).isRequired,
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
    repositoryName: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  connect(state => state.ui.repositoryDetails),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.REPOSITORY_DETAILS_FETCH,
        payload: {
          profileName: this.props.params.profileName,
          repositoryName: this.props.params.repositoryName,
          first: 5,
          after: 0,
        },
      })
    },
  }),
)(RepositoryDetails)
