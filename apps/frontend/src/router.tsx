import { useEffect } from "react";
import * as Sentry from "@sentry/react";
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

import { FeatureFlagProvider } from "./containers/FeatureFlag";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFound } from "./pages/NotFound";
import { Loader } from "./ui/Loader";

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
      <FeatureFlagProvider>
        <Outlet />
      </FeatureFlagProvider>
    </RouterProvider>
  );
}

/**
 * Check if the error is a failed to fetch error.
 */
const DYNAMIC_IMPORT_MODULE_FAILED_TO_LOAD = [
  // Blink
  /Failed to fetch/,
  // Firefox
  /error loading dynamically imported module/,
  // Safari
  /Importing a module script failed./,
];

function checkIsFailedToFetchError(error: unknown) {
  return (
    error instanceof Error &&
    DYNAMIC_IMPORT_MODULE_FAILED_TO_LOAD.some((regex) =>
      regex.test(error.message),
    )
  );
}

function checkHasReloaded() {
  const url = new URL(window.location.href);
  return url.searchParams.has("reload");
}

function RootErrorBoundary() {
  const error = useRouteError();
  const shouldReload = checkIsFailedToFetchError(error) && !checkHasReloaded();

  useEffect(() => {
    console.error(error);
    if (shouldReload) {
      const url = new URL(window.location.href);
      url.searchParams.set("reload", "true");
      window.location.replace(url);
      return;
    }

    Sentry.captureException(error, { level: "fatal" });
  }, [error, shouldReload]);

  if (shouldReload) {
    return null;
  }

  return <ErrorPage />;
}

function HydrateFallback() {
  return (
    <div className="text-primary flex h-full flex-1 items-center justify-center">
      <Loader />
    </div>
  );
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
          path: "/verify",
          HydrateFallback,
          lazy: () => import("./pages/VerifyEmail"),
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
              path: "invite/:inviteSecret",
              HydrateFallback,
              lazy: () => import("./pages/Invite"),
            },
            {
              path: "teams/new",
              HydrateFallback,
              lazy: () => import("./pages/NewTeam"),
            },
            {
              path: "teams",
              HydrateFallback,
              lazy: () => import("./pages/Teams"),
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
                  id: "test",
                  path: "tests/:testId",
                  HydrateFallback,
                  lazy: () => import("./pages/Test"),
                },
                {
                  path: "settings",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Settings"),
                },
                {
                  path: "automations",
                  HydrateFallback,
                  children: [
                    {
                      index: true,
                      HydrateFallback,
                      lazy: () => import("./pages/Automation"),
                    },
                    {
                      path: "new",
                      HydrateFallback,
                      lazy: () => import("./pages/Automation/NewAutomation"),
                    },
                    {
                      path: ":automationId",
                      HydrateFallback,
                      lazy: () => import("./pages/Automation/EditAutomation"),
                    },
                  ],
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
                  path: "~/analytics",
                  HydrateFallback,
                  lazy: () => import("./pages/Account/Analytics"),
                },
                {
                  path: "settings/*",
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
