import { ColorModeProvider } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { Layout, Main } from "@/modern/containers/Layout";

import { GlobalStyle, ThemeInitializer } from "./components";
import { ApolloInitializer } from "./containers/Apollo";
import { AuthProvider } from "./containers/Auth";
import { ScrollToTop } from "./containers/Router";
import { UserInitializer } from "./containers/User";
import { AuthCallback } from "./pages/AuthCallback";
import { Build } from "./pages/Build";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Owner } from "./pages/Owner";
import { OwnerSettings } from "./pages/Owner/OwnerSettings";
import { OwnerRepositories } from "./pages/Owner/Repositories";
import { Repository } from "./pages/Repository";
import { RepositorySettings } from "./pages/Repository/RepositorySettings";
import { Repository as OldRepository } from "./pages/Repository/index-old";

export const App = () => {
  return (
    <>
      <Helmet
        titleTemplate="%s • Argos"
        defaultTitle="Argos - Automated visual testing"
      />

      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <ApolloInitializer>
            <UserInitializer>
              <Routes>
                <Route
                  path="/auth/github/callback"
                  element={<AuthCallback />}
                />
                <Route
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber"
                  element={<Build />}
                />
                <Route
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber/:diffId"
                  element={<Build />}
                />
                <Route
                  path="/"
                  element={
                    <ThemeInitializer>
                      <ColorModeProvider>
                        <GlobalStyle />
                        <Layout>
                          <Outlet />
                        </Layout>
                      </ColorModeProvider>
                    </ThemeInitializer>
                  }
                >
                  <Route
                    index
                    element={
                      <Main>
                        <Home />
                      </Main>
                    }
                  />
                  <Route
                    path=":ownerLogin/:repositoryName"
                    element={<Repository />}
                  >
                    {/* <Route path="" element={<RepositoryBuilds />} /> */}
                    <Route path="settings" element={<RepositorySettings />} />
                  </Route>
                  <Route path=":ownerLogin" element={<Owner />}>
                    <Route path="" element={<OwnerRepositories />} />
                    <Route path="settings" element={<OwnerSettings />} />
                  </Route>
                  <Route
                    path="/old/:ownerLogin/:repositoryName/*"
                    element={<OldRepository />}
                  />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </UserInitializer>
          </ApolloInitializer>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
};
