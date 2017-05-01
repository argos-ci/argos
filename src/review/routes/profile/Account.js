import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import { List } from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import recompact from 'modules/recompact'
import Link from 'modules/components/Link'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import WatchTask from 'modules/components/WatchTask'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'
import RepositoryListItem from 'review/routes/profile/RepositoryListItem'

function Account(props) {
  const { account, onToggleRepository, user } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Layout container gutter={24}>
            <Layout item xs>
              <Typography type="display1" component="h2">
                {user.name}
              </Typography>
            </Layout>
            {!user.privateSync && (
              <Layout item>
                <Button
                  raised
                  accent
                  component={Link}
                  href="/auth/github-private"
                >
                  Synchronize private repositories
                </Button>
              </Layout>
            )}
            <Layout item xs={12}>
              <Paper>
                <WatchTask task={account.fetch}>
                  {() => (
                    <List>
                      {account.fetch.output.data.user.relatedRepositories.map(repository => (
                        <RepositoryListItem
                          key={repository.id}
                          onToggle={onToggleRepository}
                          repository={repository}
                        />
                      ))}
                    </List>
                  )}
                </WatchTask>
              </Paper>
            </Layout>
          </Layout>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Account.propTypes = {
  account: PropTypes.object.isRequired,
  onToggleRepository: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    privateSync: PropTypes.bool.isRequired,
  }),
}

export default recompact.compose(
  connect(state => ({
    user: state.data.user,
    account: state.ui.account,
  })),
  recompact.withHandlers({
    onToggleRepository: ({ dispatch }) => payload => dispatch({
      type: actionTypes.ACCOUNT_TOGGLE_CLICK,
      payload,
    }),
  }),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({ type: actionTypes.ACCOUNT_FETCH, payload: {} })
    },
  }),
)(Account)
