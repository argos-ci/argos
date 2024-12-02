import { useEffect } from "react";
import { captureException } from "@sentry/react";
import { RouterProvider } from "react-aria-components";
import {
  createBrowserRouter,
  Navigate,
  NavigateOptions,
  Outlet,
  useHref,
  useNavigate,
  useRouteError,
} from "react-router-dom";

import { Layout } from "@/containers/Layout";

import { ErrorPage } from "./pages/ErrorPage";
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

function checkIsFailedToFetchError(error: unknown) {
  return error instanceof Error && /Failed to fetch/.test(error.message);
}

function checkHasReloaded() {
  const url = new URL(window.location.href);
  return url.searchParams.has("reload");
}

function RootErrorBoundary() {
  const error = useRouteError();
  const shouldReload = checkIsFailedToFetchError(error) && !checkHasReloaded();

  useEffect(() => {
    if (shouldReload) {
      const url = new URL(window.location.href);
      url.searchParams.set("reload", "true");
      window.location.replace(url);
      return;
    }

    captureException(error, { level: "fatal" });
  }, [error, shouldReload]);

  if (shouldReload) {
    return null;
  }

  return <ErrorPage />;
}

function HydrateFallback() {
  return null;
}

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([
    {
      ErrorBoundary: RootErrorBoundary,
      path: `/auth/:provider/callback`,
      HydrateFallback,
      lazy: () => import("./pages/AuthCallback"),
    },
    {
      path: "/",
      element: <Root />,
      ErrorBoundary: RootErrorBoundary,
      children: [
        {
          path: "/:accountSlug/:projectName/builds/:buildNumber",
          HydrateFallback,
          lazy: () => import("./pages/Build"),
        },
        {
          path: "/:accountSlug/:projectName/builds/:buildNumber/:diffId",
          HydrateFallback,
          lazy: () => import("./pages/Build"),
        },
        {
          path: "/",
          HydrateFallback,
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
              HydrateFallback,
              lazy: () => import("./pages/NewProject"),
            },
            {
              path: "login",
              HydrateFallback,
              lazy: () => import("./pages/Login"),
            },
            {
              path: "signup",
              HydrateFallback,
              lazy: () => import("./pages/Signup"),
            },
            {
              path: "invite/:inviteToken",
              HydrateFallback,
              lazy: () => import("./pages/Invite"),
            },
            {
              path: "teams/new",
              HydrateFallback,
              lazy: () => import("./pages/NewTeam"),
            },
            {
              path: ":accountSlug/:projectName",
              lazy: () => import("./pages/Project"),
              HydrateFallback,
              children: [
                {
                  index: true,
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Builds"),
                },
                {
                  path: "reference",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Reference"),
                },
                {
                  path: "builds",
                  element: <Navigate to=".." replace={true} />,
                },
                {
                  path: "settings",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Settings"),
                },
              ],
            },
            {
              id: "account",
              path: ":accountSlug",
              HydrateFallback,
              lazy: () => import("./pages/Account"),
              children: [
                {
                  index: true,
                  HydrateFallback,
                  lazy: () => import("./pages/Account/Projects"),
                },
                {
                  path: "new",
                  HydrateFallback,
                  lazy: () => import("./pages/Account/NewProject"),
                },
                {
                  path: "settings",
                  HydrateFallback,
                  lazy: () => import("./pages/Account/Settings"),
                },
              ],
            },
            {
              path: "*",
              HydrateFallback,
              element: <NotFound />,
            },
          ],
        },
      ],
    },
  ]);
