import React from 'react'
import PropTypes from 'prop-types'
import recompact from 'modules/recompact'
import { connect } from 'react-redux'
import List from 'material-ui/List'
import Paper from 'material-ui/Paper'
import { withStyles } from 'material-ui/styles'
import WatchTask from 'modules/components/WatchTask'
import detailsActions from 'review/routes/repository/detailsActions'
import RepositoryDetailsEmpty from 'review/routes/repository/RepositoryDetailsEmpty'
import RepositoryDetailsItem from 'review/routes/repository/RepositoryDetailsItem'
import RepositoryDetailsLoadMore from 'review/routes/repository/RepositoryDetailsLoadMore'

const styles = {
  paper: {},
}

function RepositoryDetails(props) {
  const { classes, fetch, params } = props

  return (
    <div>
      <Paper className={classes.paper}>
        <WatchTask task={fetch}>
          {data => {
            const edges = data.repository.builds.edges

            if (edges.length === 0) {
              return <RepositoryDetailsEmpty repository={data.repository} />
            }

            return (
              <List>
                {edges.map(build => (
                  <RepositoryDetailsItem
                    key={build.id}
                    build={build}
                    profileName={params.profileName}
                    repositoryName={params.repositoryName}
                  />
                ))}
              </List>
            )
          }}
        </WatchTask>
      </Paper>
      <RepositoryDetailsLoadMore params={params} />
    </div>
  )
}

RepositoryDetails.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.shape({
    output: PropTypes.shape({
      data: PropTypes.shape({
        builds: PropTypes.shape({
          edges: PropTypes.arrayOf(
            PropTypes.shape({
              id: PropTypes.string.isRequired,
              number: PropTypes.number.isRequired,
              createdAt: PropTypes.string.isRequired,
            })
          ),
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
  withStyles(styles),
  connect(state => ({
    fetch: state.ui.repositoryDetails.fetch,
  })),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch(detailsActions.fetch(this.props, 0))
    },
  })
)(RepositoryDetails)
