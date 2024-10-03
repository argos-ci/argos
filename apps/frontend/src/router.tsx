import { RouterProvider } from "react-aria-components";
import {
  createBrowserRouter,
  Navigate,
  NavigateOptions,
  Outlet,
  useHref,
  useNavigate,
} from "react-router-dom";

import { Layout } from "@/containers/Layout";

import { NotFound } from "./pages/NotFound";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

function useAbsoluteHref(path: string) {
  const relative = useHref(path);
  if (
    path.startsWith("https://") ||
    path.startsWith("http://") ||
    path.startsWith("mailto:")
  ) {
    return path;
  }
  return relative;
}

function Root() {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={navigate} useHref={useAbsoluteHref}>
      <Outlet />
    </RouterProvider>
  );
}

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([
    {
      path: `/auth/:provider/callback`,
      lazy: () => import("./pages/AuthCallback"),
    },
    {
      path: "/",
      element: <Root />,
      children: [
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
      ],
    },
  ]);
