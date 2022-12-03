import { ColorModeProvider } from "@xstyled/styled-components";
import { Helmet } from "react-helmet";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { GlobalStyle, ThemeInitializer } from "./components";
import { ApolloInitializer } from "./containers/Apollo";
import { AuthProvider } from "./containers/Auth";
import { Layout } from "@/modern/containers/Layout";
import { ScrollToTop } from "./containers/Router";
import { UserInitializer } from "./containers/User";
import { AuthCallback } from "./pages/AuthCallback";
import { Home } from "./pages/Home";
import { Build } from "./pages/Build";
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
                  <Route index element={<Home />} />
                  <Route
                    path="/:ownerLogin/settings/*"
                    element={<OwnerSettings />}
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
