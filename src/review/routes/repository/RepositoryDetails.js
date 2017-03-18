import React, { PropTypes } from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import recompact from 'modules/recompact'
import { connect } from 'react-redux'
import {
  List,
} from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Text from 'material-ui/Text'
import withStyles from 'material-ui/styles/withStyles'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import actionTypes from 'review/modules/redux/actionTypes'
import RepositoryDetailsItem from 'review/routes/repository/RepositoryDetailsItem'

const styleSheet = createStyleSheet('RepositoryDetails', () => ({
  paper: {
    display: 'flex',
  },
}))

function RepositoryDetails(props) {
  const {
    classes,
    fetch,
    params: {
      profileName,
      repositoryName,
    },
  } = props

  return (
    <Paper className={classes.paper}>
      <WatchTask task={fetch}>
        {() => {
          if (!fetch.output.data.repository) {
            return (
              <WatchTaskContainer>
                <Text>
                  {'Repository not found'}
                </Text>
              </WatchTaskContainer>
            )
          }

          const {
            edges,
          } = fetch.output.data.repository.builds

          if (edges.length === 0) {
            return (
              <WatchTaskContainer>
                <Text>
                  {'No build yet for this repository.'}
                </Text>
              </WatchTaskContainer>
            )
          }

          return (
            <List>
              {edges.map(build => (
                <RepositoryDetailsItem
                  key={build.id}
                  build={build}
                  profileName={profileName}
                  repositoryName={repositoryName}
                />
              ))}
            </List>
          )
        }}
      </WatchTask>
    </Paper>
  )
}

RepositoryDetails.propTypes = {
  classes: PropTypes.object.isRequired,
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
  withStyles(styleSheet),
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
