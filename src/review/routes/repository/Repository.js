import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Link as LinkRouter } from 'react-router'
import Typography from 'material-ui/Typography'
import Button from 'material-ui/Button'
import Paper from 'material-ui/Paper'
import Layout from 'material-ui/Layout'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import recompact from 'modules/recompact'
import ViewContainer from 'modules/components/ViewContainer'
import Link from 'modules/components/Link'
import ScrollView from 'modules/components/ScrollView'
import LayoutBody from 'modules/components/LayoutBody'
import WatchTask from 'modules/components/WatchTask'
import WatchTaskContainer from 'modules/components/WatchTaskContainer'
import ReviewAppBar from 'review/modules/AppBar/AppBar'
import actionTypes from 'review/modules/redux/actionTypes'

const styleSheet = createStyleSheet('Repository', () => ({
  paper: {
    display: 'flex',
  },
}))

function Repository(props) {
  const {
    children,
    classes,
    fetch,
    params: {
      profileName,
      repositoryName,
    },
  } = props

  return (
    <ViewContainer>
      <ReviewAppBar />
      <ScrollView>
        <LayoutBody margin>
          <Layout container gutter={24}>
            <Layout item xs>
              <Typography type="display1" component="h2" noWrap>
                <Link to={`/${profileName}`}>
                  {profileName}
                </Link>
                /
                <Link to={`/${profileName}/${repositoryName}`}>
                  {repositoryName}
                </Link>
              </Typography>
            </Layout>
            <WatchTask task={fetch} onlySuccess>
              {(data) => {
                if (!data.repository.authorization) {
                  return null
                }

                return (
                  <Layout item>
                    <Button
                      component={LinkRouter}
                      to={`/${profileName}/${repositoryName}/settings`}
                    >
                      Settings
                    </Button>
                  </Layout>
                )
              }}
            </WatchTask>
            <Layout item xs={12}>
              <WatchTask task={fetch}>
                {(data) => {
                  if (!data.repository) {
                    return (
                      <Paper className={classes.paper}>
                        <WatchTaskContainer>
                          <Typography>
                            Repository not found
                          </Typography>
                        </WatchTaskContainer>
                      </Paper>
                    )
                  }
                  return children
                }}
              </WatchTask>
            </Layout>
          </Layout>
        </LayoutBody>
      </ScrollView>
    </ViewContainer>
  )
}

Repository.propTypes = {
  children: PropTypes.element.isRequired,
  classes: PropTypes.object.isRequired,
  fetch: PropTypes.object.isRequired,
  params: PropTypes.shape({
    profileName: PropTypes.string.isRequired,
    repositoryName: PropTypes.string.isRequired,
  }).isRequired,
}

export default recompact.compose(
  withStyles(styleSheet),
  connect(state => ({
    fetch: state.ui.repository.fetch,
  })),
  recompact.lifecycle({
    componentDidMount() {
      this.props.dispatch({
        type: actionTypes.REPOSITORY_FETCH,
        payload: {
          profileName: this.props.params.profileName,
          repositoryName: this.props.params.repositoryName,
        },
      })
    },
  }),
)(Repository)
