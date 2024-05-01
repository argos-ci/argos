import { Helmet } from "react-helmet";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";

import { Layout } from "@/containers/Layout";

import { ApolloInitializer } from "./containers/Apollo";
import { AuthContextProvider } from "./containers/Auth";
import { ColorModeProvider } from "./containers/ColorMode";
import { NotFound } from "./pages/NotFound";
import { TooltipProvider } from "./ui/Tooltip";

const router = createBrowserRouter([
  {
    path: `/auth/:provider/callback`,
    lazy: () => import("./pages/AuthCallback"),
  },
  {
    path: "/:accountSlug/:projectName/builds/:buildNumber",
    lazy: () => import("./pages/Build"),
  },
  {
    path: "/:accountSlug/:projectName/builds/:buildNumber/:diffId",
    lazy: () => import("./pages/Build"),
  },
  {
    path: "/",
    lazy: () => import("./pages/Home"),
  },
  {
    path: "/",
    element: (
      <Layout>
        <Outlet />
      </Layout>
    ),
    children: [
      {
        path: "new",
        lazy: () => import("./pages/NewProject"),
      },
      {
        path: "login",
        lazy: () => import("./pages/Login"),
      },
      {
        path: "signup",
        lazy: () => import("./pages/Signup"),
      },
      {
        path: "invite/:inviteToken",
        lazy: () => import("./pages/Invite"),
      },
      {
        path: "teams/new",
        lazy: () => import("./pages/NewTeam"),
      },
      {
        path: ":accountSlug/:projectName",
        lazy: () => import("./pages/Project"),
        children: [
          {
            index: true,
            lazy: () => import("./pages/Project/Builds"),
          },
          {
            path: "reference",
            lazy: () => import("./pages/Project/Reference"),
          },
          {
            path: "builds",
            element: <Navigate to=".." replace={true} />,
          },
          {
            path: "settings",
            lazy: () => import("./pages/Project/Settings"),
          },
        ],
      },
      {
        id: "account",
        path: ":accountSlug",
        lazy: () => import("./pages/Account"),
        children: [
          {
            index: true,
            lazy: () => import("./pages/Account/Projects"),
          },
          {
            path: "new",
            lazy: () => import("./pages/Account/NewProject"),
          },
          {
            path: "settings",
            lazy: () => import("./pages/Account/Settings"),
          },
        ],
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export const App = () => {
  return (
    <>
      <Helmet defaultTitle="Argos" />
      <TooltipProvider disableHoverableContent>
        <ColorModeProvider>
          <AuthContextProvider>
            <ApolloInitializer>
              <RouterProvider router={router} />
            </ApolloInitializer>
          </AuthContextProvider>
        </ColorModeProvider>
      </TooltipProvider>
    </>
  );
};
