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
import { AuthCallback } from "./pages/AuthCallback";
import { Build } from "./pages/Build";
import { CheckoutSuccessRedirect } from "./pages/CheckoutSuccessRedirect";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Owner } from "./pages/Owner";
import { Checkout } from "./pages/Owner/Checkout";
import { OwnerSettings } from "./pages/Owner/OwnerSettings";
import { OwnerRepositories } from "./pages/Owner/Repositories";
import { Repository } from "./pages/Repository";
import { RepositoryBuilds } from "./pages/Repository/RepositoryBuilds";
import { RepositorySettings } from "./pages/Repository/RepositorySettings";

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
                path="/:ownerLogin/:repositoryName/builds/:buildNumber"
                element={<Build />}
              />
              <Route
                path="/:ownerLogin/:repositoryName/builds/:buildNumber/:diffId"
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
                  path=":ownerLogin/:repositoryName"
                  element={<Repository />}
                >
                  <Route path="" element={<RepositoryBuilds />} />
                  <Route
                    path="builds"
                    element={<Navigate to=".." replace={true} />}
                  />
                  <Route path="settings" element={<RepositorySettings />} />
                </Route>
                <Route path=":ownerLogin" element={<Owner />}>
                  <Route path="" element={<OwnerRepositories />} />
                  <Route path="settings" element={<OwnerSettings />} />
                  <Route path="checkout" element={<Checkout />} />
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
