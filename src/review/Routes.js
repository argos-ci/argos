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
import ProductHome from 'review/routes/product/Home'
import Profile from 'review/routes/profile/Profile'
import NotFound from 'review/routes/notFound/NotFound'
import Repository from 'review/routes/repository/Repository'
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
      <Route path="/" component={ProductHome} />
      <Route path="/profile/:profileId" component={Profile} />
      <Route path="/:profileId/:repositoryId">
        <IndexRoute component={Repository} />
        <Route path="builds/:buildId" component={Build} />
        <Route path="settings" component={Settings} />
      </Route>
      <Route path="*" component={NotFound} />
    </Router>
  )
}

export default withStyles(styleSheet)(Routes)
