import { ComponentPropsWithRef, Suspense } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import * as Sentry from "@sentry/react";
import { clsx } from "clsx";
import { useMatch } from "react-router-dom";

import { ErrorPage } from "@/pages/ErrorPage";
import { PageLoader } from "@/ui/PageLoader";

import { AuthenticationError, logout } from "./Auth";
import { BuildHotkeysDialog } from "./Build/BuildHotkeys";
import { BuildHotkeysDialogStateProvider } from "./Build/BuildHotkeysDialogState";
import { Navbar } from "./Navbar";

function Main(props: {
  ref?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <main ref={props.ref} className="contents">
      <Sentry.ErrorBoundary
        fallback={<ErrorPage />}
        onError={(error: unknown) => {
          console.error(error);
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
        }}
      >
        {props.children}
      </Sentry.ErrorBoundary>
    </main>
  );
}

export function Layout(props: { children: React.ReactNode }) {
  const isFullSize = Boolean(useMatch("/:accountSlug/:projectName"));
  const hasShortcuts = Boolean(
    useMatch("/:accountSlug/:projectName/tests/:testId"),
  );
  const content = (
    <div className={clsx(isFullSize && "h-screen", "flex min-h-full flex-col")}>
      <header className="shrink-0">
        <Navbar />
      </header>
      <Main>
        <Suspense fallback={<PageLoader />}>{props.children}</Suspense>
      </Main>
    </div>
  );

  return hasShortcuts ? (
    <BuildHotkeysDialogStateProvider>
      {content}
      <BuildHotkeysDialog env="test" />
    </BuildHotkeysDialogStateProvider>
  ) : (
    content
  );
}

export function SettingsLayout(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        props.className,
        "grid grid-cols-[12rem_minmax(0,1fr)] gap-16",
      )}
    />
  );
}

export function SettingsPage(props: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "mb-6 flex max-w-4xl flex-1 flex-col gap-6",
        props.className,
      )}
    />
  );
}
