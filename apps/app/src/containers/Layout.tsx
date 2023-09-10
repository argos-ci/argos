import { ApolloError } from "@apollo/client";
import { captureException } from "@sentry/browser";
import { clsx } from "clsx";
import { HTMLProps, forwardRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useMatch } from "react-router-dom";

import { ErrorPage } from "@/pages/ErrorPage";

import { AuthenticationError, useLogout } from "./Auth";
import { Navbar } from "./Navbar";

export const Main = forwardRef<HTMLElement, { children: React.ReactNode }>(
  (props: { children: React.ReactNode }, ref) => {
    const logout = useLogout();
    return (
      <main ref={ref} className="contents">
        <ErrorBoundary
          fallback={<ErrorPage />}
          onError={(error) => {
            if (error instanceof AuthenticationError) {
              logout();
              return;
            }
            if (error instanceof ApolloError) {
              // Ignore unauthenticated errors & logout the user
              if (
                error.graphQLErrors.some(
                  (error) => error.extensions?.code === "UNAUTHENTICATED",
                )
              ) {
                logout();
                return;
              }
            }
            captureException(error);
          }}
        >
          {props.children}
        </ErrorBoundary>
      </main>
    );
  },
);

export const Layout = (props: { children: React.ReactNode }) => {
  const fullSize = useMatch("/:accountSlug/:projectName");
  return (
    <div className={clsx(fullSize && "h-screen", "flex min-h-full flex-col")}>
      <header className="flex-shrink-0">
        <Navbar />
      </header>
      <Main>{props.children}</Main>
    </div>
  );
};

export const SettingsLayout = ({
  className,
  ...props
}: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className={clsx(className, "mb-6 flex max-w-4xl flex-col gap-6")}
      {...props}
    />
  );
};
