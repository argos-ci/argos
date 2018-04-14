import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import List from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Grid from 'material-ui/Grid'
import { withStyles } from 'material-ui/styles'
import configBrowser from 'configBrowser'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import ViewContainer from 'modules/components/ViewContainer'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import WatchTask from 'modules/components/WatchTask'
import actionTypes from 'modules/redux/actionTypes'
import ReviewAppBar from 'review/modules/components/ReviewAppBar'
import ReviewFooter from 'review/modules/components/ReviewFooter'
import RepositoryListItem from 'review/routes/profile/RepositoryListItem'

const styles = {
  paper: {},
}

function Account(props) {
  const { account, classes, onToggleRepository, user } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin marginBottom>
          <Grid container spacing={24}>
            <Grid item xs>
              <Typography variant="display1" component="h2">
                {user.name}
              </Typography>
            </Grid>
            {!user.privateSync && (
              <Grid item>
                <Button
                  raised
                  color="secondary"
                  component={Link}
                  variant="button"
                  href="/auth/github-private"
                >
                  Synchronize private repositories
                </Button>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography gutterBottom>
                {'Are you missing a GitHub organization? '}
                <Link variant="primary" href={configBrowser.get('github.applicationUrl')}>
                  Check permissions.
                </Link>
              </Typography>
              <Paper className={classes.paper}>
                <WatchTask task={account.fetch}>
                  {data => {
                    if (data.user.relatedRepositories.length === 0) {
                      return (
                        <WatchTaskContainer>
                          <Typography>No related repository</Typography>
                        </WatchTaskContainer>
                      )
                    }

                    return (
                      <List>
                        {data.user.relatedRepositories.map(repository => (
                          <RepositoryListItem
                            key={repository.id}
                            onToggle={onToggleRepository}
                            repository={repository}
                          />
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

Account.propTypes = {
  account: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired,
  onToggleRepository: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    privateSync: PropTypes.bool.isRequired,
  }),
}

export default recompact.compose(
  withStyles(styles),
  connect(state => ({
    user: state.data.user,
    account: state.ui.account,
  })),
  recompact.withHandlers({
    onToggleRepository: ({ dispatch }) => payload =>
      dispatch({
        type: actionTypes.ACCOUNT_TOGGLE_CLICK,
        payload,
      }),
  }),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({ type: actionTypes.ACCOUNT_FETCH, payload: {} })
    },
  })
)(Account)
