import React from 'react'
import PropTypes from 'prop-types'
import recompact from 'modules/recompact'
import { connect } from 'react-redux'
import Button from 'material-ui/Button'
import { withStyles } from 'material-ui/styles'
import detailsActions from 'review/routes/repository/detailsActions'
import { isSuccess } from 'modules/rxjs/operator/watchTask'

const styles = theme => ({
  loadMore: {
    marginTop: theme.spacing.unit * 2,
  },
})

function RepositoryDetailsLoadMore(props) {
  const { classes, fetch, onClickLoadMore } = props

  if (!isSuccess(fetch)) {
    return null
  }

  const data = fetch.output.data

  if (!data.repository || !data.repository.builds.pageInfo.hasNextPage) {
    return null
  }

  return (
    <Button className={classes.loadMore} onClick={onClickLoadMore}>
      Load more
    </Button>
  )
}

RepositoryDetailsLoadMore.propTypes = {
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
  onClickLoadMore: PropTypes.func.isRequired,
}

export default recompact.compose(
  withStyles(styles),
  connect(state => ({
    fetch: state.ui.repositoryDetails.fetch,
  })),
  recompact.withHandlers({
    onClickLoadMore: props => () => {
      const after = props.fetch.output.data.repository.builds.pageInfo.endCursor
      props.dispatch(detailsActions.fetch(props, after))
    },
  })
)(RepositoryDetailsLoadMore)
