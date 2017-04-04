import React, { PropTypes } from 'react'
import { connect } from 'react-redux'
import { compose, lifecycle, withHandlers, withProps } from 'recompact'
import Text from 'material-ui/Text'
import Button from 'material-ui/Button'
import Link from 'modules/components/Link'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'
import { List, ListItem, ListItemText } from 'material-ui/List'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import Switch from 'material-ui/Switch'
import WatchTask from 'modules/components/WatchTask'

const RepositoryListItem = compose(
  withProps(({ repository }) => ({
    uri: `${repository.owner.login}/${repository.name}`,
  })),
  withHandlers({
    onToggle: ({ onToggle, repository }) => () => onToggle({
      repositoryId: repository.id,
      enabled: !repository.enabled,
    }),
  }),
)(({ onToggle, repository, uri }) => (
  <ListItem button key={uri} onClick={onToggle}>
    <ListItemText primary={uri} />
    <Switch checked={repository.enabled} />
  </ListItem>
))

function Account({ account, onToggleRepository, user }) {
  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Layout container>
            <Layout item xs>
              <Text type="display1" component="h2" gutterBottom>
                {user.name}
              </Text>
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
          </Layout>
          <Paper>
            <WatchTask task={account.fetch}>
              {() => (
                <List>
                  {account.fetch.output.data.user.relatedRepositories.map((repository, index) => (
                    <RepositoryListItem
                      key={index} // eslint-disable-line react/no-array-index-key
                      onToggle={onToggleRepository}
                      repository={repository}
                    />
                  ))}
                </List>
              )}
            </WatchTask>
          </Paper>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Account.propTypes = {
  account: PropTypes.object,
  onToggleRepository: PropTypes.func.isRequired,
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    privateSync: PropTypes.bool.isRequired,
  }),
}

export default compose(
  connect(state => ({
    user: state.data.user,
    account: state.ui.account,
  })),
  withHandlers({
    onToggleRepository: ({ dispatch }) => payload => dispatch({
      type: actionTypes.ACCOUNT_TOGGLE_CLICK,
      payload,
    }),
  }),
  lifecycle({
    componentDidMount() {
      this.props.dispatch({ type: actionTypes.ACCOUNT_FETCH, payload: {} })
    },
  }),
)(Account)
