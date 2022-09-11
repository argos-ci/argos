import * as React from "react";
import { Helmet } from "react-helmet";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop, GoogleAnalytics } from "./containers/Router";
import { AuthInitializer } from "./containers/Auth";
import { ApolloInitializer } from "./containers/Apollo";
import { UserInitializer } from "./containers/User";
import { AuthCallback } from "./pages/AuthCallback";
import { GlobalStyle, ThemeInitializer } from "./components";
import { Layout } from "./containers/Layout";
import { Home } from "./pages/Home";
import { Preflight } from "@xstyled/styled-components";
import { NotFoundWithContainer } from "./pages/NotFound";
import { Repository } from "./pages/Repository";
import { OwnerSettings } from "./pages/Owner/OwnerSettings";
import { Build } from "./pages/Build";
import { OwnerRepositories } from "./pages/Owner/Repositories";

export function App() {
  return (
    <ThemeInitializer>
      <Preflight />
      <Helmet
        titleTemplate="%s • Argos"
        defaultTitle="Argos - Automated visual testing"
      >
        <meta name="robots" content="noindex" />
      </Helmet>
      <GlobalStyle />
      <BrowserRouter>
        <ScrollToTop />
        <GoogleAnalytics />
        <AuthInitializer>
          <ApolloInitializer>
            <UserInitializer>
              <Routes>
                <Route
                  exact
                  path="/auth/github/callback"
                  element={<AuthCallback />}
                />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route
                    path="/:ownerLogin/settings/*"
                    element={<OwnerSettings />}
                  />
                  <Route
                    path="/:ownerLogin/:repositoryName/builds/:buildNumber"
                    element={<Build />}
                  />
                  <Route
                    path="/:ownerLogin/:repositoryName/*"
                    element={<Repository />}
                  />
                  <Route path="/:ownerLogin" element={<OwnerRepositories />} />
                  <Route path="*" element={<NotFoundWithContainer />} />
                </Route>
              </Routes>
            </UserInitializer>
          </ApolloInitializer>
        </AuthInitializer>
      </BrowserRouter>
    </ThemeInitializer>
  );
}
