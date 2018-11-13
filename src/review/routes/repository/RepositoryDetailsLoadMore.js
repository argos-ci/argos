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

class RepositoryDetailsLoadMore extends React.Component {
  static propTypes = {
    classes: PropTypes.object.isRequired,
    fetch: PropTypes.object.isRequired,
    onClickLoadMore: PropTypes.func.isRequired,
  }

  onClickLoadMore = () => {
    const after = this.props.fetch.output.data.repository.builds.pageInfo.endCursor
    this.props.dispatch(detailsActions.fetch(this.props, after))
  }

  render() {
    const { classes, fetch } = this.props

    if (!isSuccess(fetch)) {
      return null
    }

    const data = fetch.output.data

    if (!data.repository || !data.repository.builds.pageInfo.hasNextPage) {
      return null
    }

    return (
      <Button className={classes.loadMore} onClick={this.onClickLoadMore}>
        Load more
      </Button>
    )
  }
}

export default recompact.compose(
  withStyles(styles),
  connect(state => ({
    fetch: state.ui.repositoryDetails.fetch,
  }))
)(RepositoryDetailsLoadMore)
