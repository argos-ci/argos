import React, { PropTypes } from 'react'
import { Link as LinkRouter } from 'react-router'
import { connect } from 'react-redux'
import recompact from 'modules/recompact'
import Text from 'material-ui/Text'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import Paper from 'material-ui/Paper'
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
                const {
                  organizations,
                } = fetch.output.data

                if (organizations.length === 0) {
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
                    {organizations.map(organization => (
                      <ListItem
                        key={organization.id}
                        button
                        component={LinkRouter}
                        to={`/${organization.name}`}
                      >
                        <ListItemText primary={organization.name} />
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
