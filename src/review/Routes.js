import React from 'react'
import CssBaseline from 'material-ui/CssBaseline'
import { applyRouterMiddleware, browserHistory, Router, Route, IndexRoute } from 'react-router'
import plugAnalyticsMiddleware from 'modules/reactRouter/plugAnalyticsMiddleware'
import App from 'review/routes/App'
import Homepage from 'review/routes/homepage/Homepage'
import Admin from 'review/routes/admin/Admin'
import Profile from 'review/routes/profile/Profile'
import Account from 'review/routes/profile/Account'
import ErrorNotFound from 'review/routes/error/ErrorNotFound'
import Repository from 'review/routes/repository/Repository'
import RepositoryDetails from 'review/routes/repository/RepositoryDetails'
import Build from 'review/routes/build/Build'
import Settings from 'review/routes/settings/Settings'
import GettingStarted from 'review/routes/gettingStarted/GettingStarted'
import About from 'review/routes/about/About'
import Security from 'review/routes/security/Security'
import Terms from 'review/routes/terms/Terms'
import Support from 'review/routes/support/Support'
import Privacy from 'review/routes/privacy/Privacy'
import Documentation from 'review/routes/documentation/Documentation'

function Routes() {
  return (
    <div>
      <CssBaseline />
      <Router history={browserHistory} render={applyRouterMiddleware(plugAnalyticsMiddleware)}>
        <Route component={App}>
          <Route path="/" component={Homepage} />
          <Route path="/about" component={About} />
          <Route path="/admin" component={Admin} />
          <Route path="/documentation" component={Documentation} />
          <Route path="/security" component={Security} />
          <Route path="/terms" component={Terms} />
          <Route path="/support" component={Support} />
          <Route path="/privacy" component={Privacy} />
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
    </div>
  )
}

export default Routes
