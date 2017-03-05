import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import { connect } from 'react-redux'
import recompact from 'modules/recompact'
import Text from 'material-ui/Text'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import Avatar from 'material-ui/Avatar'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import {
  List,
  ListItem,
  ListItemText,
} from 'material-ui/List'
import ViewContainer from 'modules/components/ViewContainer'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'

function Dashboard(props) {
  const {
    fetch,
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Text type="display1" component="h2" gutterBottom>
            {'Dashboard'}
          </Text>
          <Paper>
            <WatchTask task={fetch}>
              {() => {
                const { owners } = fetch.output.data

                if (owners.length === 0) {
                  return (
                    <WatchTaskContainer>
                      <Text>
                        {'No organization'}
                      </Text>
                    </WatchTaskContainer>
                  )
                }

                return (
                  <List>
                    {owners.map(({ name }) => (
                      <ListItem
                        key={name}
                        button
                        component={LinkRouter}
                        to={`/${name}`}
                      >
                        <Layout container align="center">
                          <Layout item>
                            <Avatar src={`https://github.com/${name}.png?size=200`} />
                          </Layout>
                          <Layout item>
                            <ListItemText primary={name} />
                          </Layout>
                        </Layout>
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

Dashboard.propTypes = {
  dispatch: PropTypes.func.isRequired,
  fetch: PropTypes.object.isRequired,
}

export default recompact.compose(
  connect(state => state.ui.dashboard),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.DASHBOARD_FETCH,
      })
    },
  }),
)(Dashboard)
