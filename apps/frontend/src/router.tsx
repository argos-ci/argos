import { useEffect } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useParams,
  useRouteError,
} from "react-router";

import { Layout } from "@/containers/Layout";
import {
  desktopRouteHandle,
  ResponsiveViewport,
  responsiveRouteHandle,
} from "@/containers/ResponsiveViewport";

import { AuthenticationError, logout } from "./containers/Auth";
import { ErrorPage } from "./pages/ErrorPage";
import { NotFound } from "./pages/NotFound";
import { RequireSAMLLogin } from "./pages/RequireSAMLLogin";
import { Loader } from "./ui/Loader";
import { TooltipProvider } from "./ui/Tooltip";
import { checkIsErrorCode } from "./util/error";

function ViewportRoot() {
  return (
    <>
      <ResponsiveViewport />
      <Outlet />
    </>
  );
}

function Root() {
  return (
    // Base UI reads tooltip delays from a provider rather than from each
    // tooltip, and one shared provider is also what gives them their warm-up:
    // once any tooltip has opened, the next opens immediately.
    <TooltipProvider>
      <ResponsiveViewport />
      <Outlet />
    </TooltipProvider>
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
  const isAuthError =
    error instanceof AuthenticationError ||
    (CombinedGraphQLErrors.is(error) &&
      error.errors.some(
        (error) => error.extensions?.code === "UNAUTHENTICATED",
      ));

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }

    if (isSAMLRequired) {
      return;
    }

    if (shouldReload) {
      const url = new URL(window.location.href);
      url.searchParams.set("reload", String(Date.now()));
      window.location.replace(url);
      return;
    }

    // Ignore auth errors and logout.
    if (isAuthError) {
      logout();
      return;
    }

    Sentry.captureException(error, { level: "fatal" });
  }, [error, shouldReload, isSAMLRequired, isAuthError]);

  if (shouldReload) {
    return null;
  }

  // We display nothing while we are logging out the user.
  if (isAuthError) {
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
      // Outside `Root`, which mounts the viewport switch for the rest of the
      // app: these pages need one of their own.
      element: <ViewportRoot />,
      handle: responsiveRouteHandle,
      children: [
        {
          ErrorBoundary: RootErrorBoundary,
          path: `/auth/:provider/callback`,
          HydrateFallback,
          lazy: () => import("./pages/AuthCallback"),
        },
        {
          ErrorBoundary: RootErrorBoundary,
          path: `/auth/cli`,
          HydrateFallback,
          lazy: () => import("./pages/AuthCLI"),
        },
        {
          ErrorBoundary: RootErrorBoundary,
          path: `/auth/cli/success`,
          HydrateFallback,
          lazy: () => import("./pages/AuthCLISuccess"),
        },
        {
          ErrorBoundary: RootErrorBoundary,
          path: `/oauth/authorize`,
          HydrateFallback,
          lazy: () => import("./pages/OAuthAuthorize"),
        },
      ],
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
          // Outside the app layout, and deliberately short: this URL is pasted
          // into pull requests and chat messages, and read by people who have
          // never signed in.
          // Kept at the desktop width, like the build page whose viewer it
          // shares.
          path: "/m/:shareToken",
          HydrateFallback,
          lazy: () => import("./pages/MediaShare"),
        },
        {
          path: "/verify",
          HydrateFallback,
          handle: responsiveRouteHandle,
          lazy: () => import("./pages/VerifyEmail"),
        },
        {
          path: "/account/delete",
          HydrateFallback,
          handle: responsiveRouteHandle,
          lazy: () => import("./pages/ConfirmAccountDeletion"),
        },
        {
          // Outside the app layout: the first screen after signup owns the whole
          // viewport, with no nav to click away into. Under `~/` so the path can
          // never collide with an account slug.
          path: "/~/welcome",
          HydrateFallback,
          handle: responsiveRouteHandle,
          lazy: () => import("./pages/Welcome"),
        },
        {
          path: "/",
          HydrateFallback,
          handle: responsiveRouteHandle,
          lazy: () => import("./pages/Home"),
        },
        {
          path: "/",
          // Every page of the app layout is laid out for phones. The build page
          // is not one of them: it keeps the desktop width, outside the layout.
          handle: responsiveRouteHandle,
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
              // Kept so bookmarks to the former staff directory keep working.
              path: "teams/all",
              element: <Navigate to="/staff/teams" replace={true} />,
            },
            {
              path: "staff",
              HydrateFallback,
              lazy: () => import("./pages/Staff"),
              children: [
                {
                  index: true,
                  element: <Navigate to="teams" replace={true} />,
                },
                {
                  path: "teams",
                  HydrateFallback,
                  lazy: () => import("./pages/Staff/Teams"),
                },
                {
                  path: "trials",
                  HydrateFallback,
                  lazy: () => import("./pages/Staff/Trials"),
                },
                {
                  path: "revenue",
                  HydrateFallback,
                  lazy: () => import("./pages/Staff/Revenue"),
                },
              ],
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
                  path: "ignored",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/IgnoredChanges"),
                },
                {
                  path: "deployments",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Deployments"),
                },
                {
                  id: "test",
                  path: "tests/:testId",
                  // Not laid out for phones yet: it shares the build page's
                  // diff viewer, and keeps the desktop width like it.
                  handle: desktopRouteHandle,
                  HydrateFallback,
                  lazy: () => import("./pages/Test"),
                },
                {
                  path: "tests",
                  HydrateFallback,
                  lazy: () => import("./pages/Project/Tests"),
                },
                {
                  path: "settings/*",
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
                  path: "~/tests",
                  HydrateFallback,
                  lazy: () => import("./pages/Account/Tests"),
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
