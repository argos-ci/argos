import React from 'react'
import { Helmet } from 'react-helmet'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { Normalize } from '@smooth-ui/core-sc'
import { ScrollToTop, GoogleAnalytics } from './containers/Router'
import { AuthInitializer } from './containers/Auth'
import { ApolloInitializer } from './containers/Apollo'
import { ThemeInitializer } from './containers/Theme'
import { UserInitializer } from './containers/User'
import { SyncAlertBar } from './containers/SyncAlertBar'
import { AppNavbar } from './containers/AppNavbar'
import { AppFooter } from './containers/AppFooter'
import { Home } from './pages/Home'
import { Owner } from './pages/Owner'
import { ErrorPage } from './pages/ErrorPage'
import { Repository } from './pages/Repository'
import { NotFound } from './pages/NotFound'
import { AuthCallback } from './pages/AuthCallback'
import Privacy from './pages/Privacy.md'
import Terms from './pages/Terms.md'
import Security from './pages/Security.md'

import {
  GlobalStyle,
  Layout,
  LayoutHeader,
  LayoutMain,
  LayoutFooter,
  Markdown,
  Catch,
} from './components'

export function App() {
  return (
    <ThemeInitializer>
      <>
        <Helmet defaultTitle="Argos CI" />
        <Normalize />
        <GlobalStyle />
        <BrowserRouter>
          <ScrollToTop />
          <GoogleAnalytics />
          <AuthInitializer>
            <ApolloInitializer>
              <UserInitializer>
                <Switch>
                  <Route exact path="/auth/github/callback">
                    <AuthCallback />
                  </Route>
                  <Route>
                    <Layout>
                      <LayoutHeader>
                        <AppNavbar />
                      </LayoutHeader>
                      <SyncAlertBar />
                      <LayoutMain>
                        <Catch fallback={<ErrorPage />}>
                          <Switch>
                            <Route exact path="/" component={Home} />
                            <Route
                              exact
                              path="/privacy"
                              render={() => (
                                <Markdown title="Privacy">{Privacy}</Markdown>
                              )}
                            />
                            <Route
                              exact
                              path="/terms"
                              render={() => (
                                <Markdown title="Terms">{Terms}</Markdown>
                              )}
                            />
                            <Route
                              exact
                              path="/security"
                              render={() => (
                                <Markdown title="Security">{Security}</Markdown>
                              )}
                            />
                            <Route
                              exact
                              path="/:ownerLogin"
                              component={Owner}
                            />
                            <Route
                              exact
                              path="/:ownerLogin/settings"
                              component={Owner}
                            />
                            <Route
                              path="/:ownerLogin/:repositoryName"
                              component={Repository}
                            />
                            <Route component={NotFound} />
                          </Switch>
                        </Catch>
                      </LayoutMain>
                      <LayoutFooter>
                        <AppFooter />
                      </LayoutFooter>
                    </Layout>
                  </Route>
                </Switch>
              </UserInitializer>
            </ApolloInitializer>
          </AuthInitializer>
        </BrowserRouter>
      </>
    </ThemeInitializer>
  )
}
