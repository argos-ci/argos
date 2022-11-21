import { ColorModeProvider } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { GlobalStyle, ThemeInitializer } from "./components";
import { ApolloInitializer } from "./containers/Apollo";
import { AuthProvider } from "./containers/Auth";
import { Layout } from "./containers/Layout";
import { ScrollToTop } from "./containers/Router";
import { UserInitializer } from "./containers/User";
import { AuthCallback } from "./pages/AuthCallback";
import { Build } from "./pages/Build";
import { Home } from "./pages/Home";
import { ModernBuild } from "./pages/ModernBuild";
import { NotFoundWithContainer } from "./pages/NotFound";
import { OwnerSettings } from "./pages/Owner/OwnerSettings";
import { OwnerRepositories } from "./pages/Owner/Repositories";
import { Repository } from "./pages/Repository";

export const App = () => {
  return (
    <>
      <Helmet
        titleTemplate="%s • Argos"
        defaultTitle="Argos - Automated visual testing"
      >
        <meta name="robots" content="noindex" />
      </Helmet>

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
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber/new/:diffRank"
                  element={
                    <ThemeInitializer>
                      <ColorModeProvider>
                        <GlobalStyle />
                      </ColorModeProvider>
                    </ThemeInitializer>
                  }
                />
                <Route
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber/new/"
                  element={
                    <ThemeInitializer>
                      <ColorModeProvider>
                        <GlobalStyle />
                      </ColorModeProvider>
                    </ThemeInitializer>
                  }
                />
                <Route
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber/modern"
                  element={<ModernBuild />}
                />
                <Route
                  path="/:ownerLogin/:repositoryName/builds/:buildNumber/modern/:diffId"
                  element={<ModernBuild />}
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
        </AuthProvider>
      </BrowserRouter>
    </>
  );
};
