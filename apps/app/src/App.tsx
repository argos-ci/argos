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
import { ErrorPage } from "./pages/ErrorPage";
import { Home } from "./pages/Home";
import { Invite } from "./pages/Invite";
import { Login } from "./pages/Login";
import { NewTeam } from "./pages/NewTeam";
import { NotFound } from "./pages/NotFound";
import { Project } from "./pages/Project";
import { ProjectBuilds } from "./pages/Project/Builds";
import { ProjectSettings } from "./pages/Project/Settings";
import { Tests } from "./pages/Project/Tests";
import { VercelCallback } from "./pages/Vercel";

export const App = () => {
  return (
    <>
      <Helmet defaultTitle="Argos" />
      <BrowserRouter>
        <AuthProvider>
          <ApolloInitializer>
            <Routes>
              <Route path="/auth/github/callback" element={<AuthCallback />} />
              <Route path="/vercel/callback" element={<VercelCallback />} />
              <Route
                path="/:accountSlug/:projectName/builds/:buildNumber"
                element={<Build />}
              />
              <Route
                path="/:accountSlug/:projectName/builds/:buildNumber/:diffId"
                element={<Build />}
              />
              <Route
                path="/"
                element={
                  <Layout>
                    <Outlet />
                  </Layout>
                }
              >
                <Route index element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/invite/:inviteToken" element={<Invite />} />
                <Route
                  path="/teams/new"
                  element={
                    <Main>
                      <NewTeam />
                    </Main>
                  }
                />
                <Route path=":accountSlug/:projectName" element={<Project />}>
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
                <Route path="error" element={<ErrorPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </ApolloInitializer>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
};
