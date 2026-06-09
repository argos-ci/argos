import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { Helmet } from "react-helmet";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { Layout } from "@/containers/Layout";
import { Linkify } from "@/containers/Linkify";
import { UniversalNavigate } from "@/containers/Redirect";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { APIError, fetchApi } from "@/util/api";
import { getAutoInviteTeamsURL } from "@/util/auto-invite";
import {
  AuthProvider,
  checkIsAuthProvider,
  getRedirectFromState,
} from "@/util/oauth";

import { NotFound } from "./NotFound";

function extractErrorMessage(error: unknown) {
  if (
    error instanceof APIError &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data &&
    error.data.error &&
    typeof error.data.error === "object" &&
    "message" in error.data.error &&
    typeof error.data.error.message === "string"
  ) {
    return error.data.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
}

function getLoginUrl(error: unknown) {
  const errorMessage = extractErrorMessage(error);
  if (errorMessage) {
    return `/login?error=${encodeURIComponent(errorMessage)}`;
  }
  return "/login";
}

function AuthCallback(props: { provider: AuthProvider }) {
  const { provider } = props;
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const redirectUri = state ? getRedirectFromState({ state, provider }) : null;
  const [authError, setAuthError] = useState<Error | null>(null);
  useEffect(() => {
    if (!code || !redirectUri) {
      return;
    }

    fetchApi<{ creation: boolean; hasAutoInvite: boolean }>(
      `/auth/${provider}`,
      {
        data: { code },
      },
    )
      .then((data) => {
        const target =
          data.creation && data.hasAutoInvite
            ? getAutoInviteTeamsURL(redirectUri)
            : redirectUri;
        // The server set the session cookie on the response. Do a full
        // navigation so the app re-bootstraps as the logged-in user.
        window.location.replace(target);
      })
      .catch((error) => {
        setAuthError(error);
      });
  }, [code, provider, redirectUri]);

  // If a authError is thrown, it will be caught by the ErrorBoundary.
  if (authError) {
    throw authError;
  }

  if (!code || !redirectUri) {
    throw <UniversalNavigate to={redirectUri ?? "/login"} replace />;
  }

  // If there is an error param, redirect to the login page.
  if (errorParam) {
    return <UniversalNavigate to="/login" replace />;
  }

  return null;
}

function ErrorFallback(props: { error: unknown; provider: AuthProvider }) {
  const { error, provider } = props;
  const isLoggedIn = useIsLoggedIn();
  const [searchParams] = useSearchParams();

  if (isLoggedIn) {
    const state = searchParams.get("state");
    const redirectUri = state
      ? getRedirectFromState({ state, provider })
      : null;
    const errorMessage = extractErrorMessage(error);
    if (errorMessage) {
      return (
        <Layout>
          <Container>
            <Helmet>
              <title>Authentication error</title>
            </Helmet>
            <Alert>
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertText className="whitespace-pre-wrap">
                <Linkify repoUrl={null}>{errorMessage}</Linkify>
              </AlertText>
              <AlertActions>
                <LinkButton href={redirectUri ?? "/"}>Back</LinkButton>
              </AlertActions>
            </Alert>
          </Container>
        </Layout>
      );
    }
    return <Navigate to={redirectUri ?? "/"} replace />;
  }

  return <UniversalNavigate to={getLoginUrl(error)} replace />;
}

export function Component() {
  const params = useParams();
  const { provider } = params;
  if (!provider || !checkIsAuthProvider(provider)) {
    return <NotFound />;
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <ErrorFallback error={error} provider={provider} />
      )}
    >
      <AuthCallback provider={provider} />
    </Sentry.ErrorBoundary>
  );
}
