import React from 'react'
import { createStyleSheet } from 'jss-theme-reactor'
import withStyles from 'material-ui-build-next/src/styles/withStyles'
import {
  applyRouterMiddleware,
  browserHistory,
  Router,
  Route,
  IndexRoute,
 } from 'react-router'
import plugAnalyticsMiddleware from 'modules/reactRouter/plugAnalyticsMiddleware'
import Homepage from 'review/routes/homepage/Homepage'
import Profile from 'review/routes/profile/Profile'
import ProfileDetails from 'review/routes/profile/Details'
import NotFound from 'review/routes/notFound/NotFound'
import Repository from 'review/routes/repository/Repository'
import RepositoryDetails from 'review/routes/repository/Details'
import Build from 'review/routes/build/Build'
import Settings from 'review/routes/settings/Settings'

const styleSheet = createStyleSheet('Routes', (theme) => {
  return {
    '@global': {
      html: {
        background: theme.palette.background.default,
        fontFamily: theme.typography.fontFamily,
        WebkitFontSmoothing: 'antialiased', // Antialiasing.
        MozOsxFontSmoothing: 'grayscale', // Antialiasing.
      },
      body: {
        margin: 0,
      },
      a: {
        color: 'inherit',
      },
    },
  }
})

function Routes() {
  return (
    <Router
      history={browserHistory}
      render={applyRouterMiddleware(
        plugAnalyticsMiddleware,
      )}
    >
      <Route path="/" component={Homepage} />
      <Route path="/profile/:profileId" component={ProfileDetails} />
      <Route path="/:profileId" component={Profile} />
      <Route path="/:profileId/:repositoryId" component={Repository}>
        <IndexRoute component={RepositoryDetails} />
        <Route path="builds/:buildId" component={Build} />
        <Route path="settings" component={Settings} />
      </Route>
      <Route path="*" component={NotFound} />
    </Router>
  )
}

export default withStyles(styleSheet)(Routes)
