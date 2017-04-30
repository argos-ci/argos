import React from 'react'
import { withStyles, createStyleSheet } from 'material-ui/styles'
import {
  applyRouterMiddleware,
  browserHistory,
  Router,
  Route,
  IndexRoute,
 } from 'react-router'
import plugAnalyticsMiddleware from 'modules/reactRouter/plugAnalyticsMiddleware'
import App from 'review/routes/App'
import Homepage from 'review/routes/homepage/Homepage'
import Profile from 'review/routes/profile/Profile'
import Account from 'review/routes/profile/Account'
import ErrorNotFound from 'review/routes/error/ErrorNotFound'
import Repository from 'review/routes/repository/Repository'
import RepositoryDetails from 'review/routes/repository/RepositoryDetails'
import Build from 'review/routes/build/Build'
import Settings from 'review/routes/settings/Settings'
import GettingStarted from 'review/routes/gettingStarted/GettingStarted'

const styleSheet = createStyleSheet('Routes', theme => ({
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
}))

function Routes() {
  return (
    <Router
      history={browserHistory}
      render={applyRouterMiddleware(
        plugAnalyticsMiddleware,
      )}
    >
      <Route component={App}>
        <Route path="/" component={Homepage} />
        <Route path="/profile/account" component={Account} />
        <Route path="/:profileName" component={Profile} />
        <Route path="/:profileName/:repositoryName" component={Repository}>
          <IndexRoute component={RepositoryDetails} />
          <Route path="builds/:buildId" component={Build} />
          <Route path="settings" component={Settings} />
          <Route path="getting-started" component={GettingStarted} />
        </Route>
        <Route path="*" component={ErrorNotFound} />
      </Route>
    </Router>
  )
}

export default withStyles(styleSheet)(Routes)
