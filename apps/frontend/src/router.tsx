import { useEffect } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/react";
import { RouterProvider } from "react-aria-components";
import {
  createBrowserRouter,
  Navigate,
  NavigateOptions,
  Outlet,
  useHref,
  useNavigate,
  useParams,
  useRouteError,
} from "react-router-dom";

import { Layout } from "@/containers/Layout";

import { AuthenticationError, logout } from "./containers/Auth";
import { FeatureFlagProvider } from "./containers/FeatureFlag";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFound } from "./pages/NotFound";
import { RequireSAMLLogin } from "./pages/RequireSAMLLogin";
import { Loader } from "./ui/Loader";
import { checkIsErrorCode } from "./util/error";

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

/**
 * Check if the app is in the reloaded state.
 * If so, we will notify the error on Sentry.
 */
function checkHasReloaded() {
  const url = new URL(window.location.href);
  const reloadParam = url.searchParams.get("reload");
  if (!reloadParam) {
    return false;
  }
  const reloadTimestamp = new Date(reloadParam).getTime();
  if (Number.isNaN(reloadTimestamp)) {
    return false;
  }
  const elapsed = Date.now() - reloadTimestamp;
  // We allow a 10s window (time to load) to consider the reload param valid.
  return elapsed < 10_000;
}

function RootErrorBoundary() {
  const error = useRouteError();
  const shouldReload = checkIsFailedToFetchError(error) && !checkHasReloaded();
  const isSAMLRequired = checkIsErrorCode(error, "SAML_SSO_REQUIRED");

  useEffect(() => {
    if (isSAMLRequired) {
      return;
    }

    if (shouldReload) {
      const url = new URL(window.location.href);
      url.searchParams.set("reload", String(Date.now()));
      window.location.replace(url);
      return;
    }

    if (error instanceof AuthenticationError) {
      logout();
      return;
    }

    if (CombinedGraphQLErrors.is(error)) {
      // Ignore unauthenticated errors & logout the user
      if (
        error.errors.some(
          (error) => error.extensions?.code === "UNAUTHENTICATED",
        )
      ) {
        logout();
        return;
      }
    }

    Sentry.captureException(error, { level: "fatal" });
  }, [error, shouldReload, isSAMLRequired]);

  if (shouldReload) {
    return null;
  }

  if (isSAMLRequired) {
    return <RequireSAMLLogin />;
  }

  return <ErrorPage />;
}

function HydrateFallback() {
  return (
    <div className="text-primary flex h-full flex-1 items-center justify-center">
      <Loader className="size-16" />
    </div>
  );
}

function RedirectToTeamInvite() {
  const params = useParams<{ inviteSecret: string }>();
  const secret = params.inviteSecret;
  invariant(secret, "no invite secret");
  return <Navigate to={`/teams/invite/${secret}`} replace={true} />;
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
              Component: RedirectToTeamInvite,
            },
            {
              path: "teams/invite/:inviteSecret",
              HydrateFallback,
              lazy: () => import("./pages/TeamsInvite"),
            },
            {
              path: "invites/:inviteSecret",
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
              path: "teams/all",
              HydrateFallback,
              lazy: () => import("./pages/StaffTeams"),
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
                  path: "tests",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Tests"),
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
