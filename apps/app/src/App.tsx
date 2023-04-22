import { Helmet } from "react-helmet";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { Layout, Main } from "@/containers/Layout";

import { ApolloInitializer } from "./containers/Apollo";
import { AuthProvider } from "./containers/Auth";
import { Account } from "./pages/Account";
import { AccountCheckout } from "./pages/Account/Checkout";
import { AccountNewProject } from "./pages/Account/NewProject";
import { AccountProjects } from "./pages/Account/Projects";
import { AccountSettings } from "./pages/Account/Settings";
import { AuthCallback } from "./pages/AuthCallback";
import { Build } from "./pages/Build";
import { CheckoutSuccessRedirect } from "./pages/CheckoutSuccessRedirect";
import { Home } from "./pages/Home";
import { NewTeam } from "./pages/NewTeam";
import { NotFound } from "./pages/NotFound";
import { Project } from "./pages/Project";
import { ProjectBuilds } from "./pages/Project/Builds";
import { ProjectSettings } from "./pages/Project/Settings";
import { Tests } from "./pages/Project/Tests";

export const App = () => {
  return (
    <>
      <Helmet defaultTitle="Argos" />
      <BrowserRouter>
        <AuthProvider>
          <ApolloInitializer>
            <Routes>
              <Route path="/auth/github/callback" element={<AuthCallback />} />
              <Route
                path="/:accountSlug/:projectSlug/builds/:buildNumber"
                element={<Build />}
              />
              <Route
                path="/:accountSlug/:projectSlug/builds/:buildNumber/:diffId"
                element={<Build />}
              />
              <Route
                path="/checkout-success"
                element={<CheckoutSuccessRedirect />}
              />
              <Route
                path="/"
                element={
                  <Layout>
                    <Outlet />
                  </Layout>
                }
              >
                <Route
                  index
                  element={
                    <Main>
                      <Helmet>
                        <title>All my repositories</title>
                      </Helmet>
                      <Home />
                    </Main>
                  }
                />
                <Route
                  path="/teams/new"
                  element={
                    <Main>
                      <NewTeam />
                    </Main>
                  }
                />
                <Route path=":accountSlug/:projectSlug" element={<Project />}>
                  <Route path="" element={<ProjectBuilds />} />
                  <Route
                    path="builds"
                    element={<Navigate to=".." replace={true} />}
                  />
                  <Route path="tests" element={<Tests />} />
                  <Route path="settings" element={<ProjectSettings />} />
                </Route>
                <Route path=":accountSlug" element={<Account />}>
                  <Route path="" element={<AccountProjects />} />
                  <Route path="new" element={<AccountNewProject />} />
                  <Route path="settings" element={<AccountSettings />} />
                  <Route path="checkout" element={<AccountCheckout />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </ApolloInitializer>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
};
