import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import { Helmet } from "react-helmet";
import { Navigate, useParams, useSearchParams } from "react-router";
import { z } from "zod";

import { useAuth } from "@/containers/Auth";
import { Layout } from "@/containers/Layout";
import { Linkify } from "@/containers/Linkify";
import { UniversalNavigate } from "@/containers/Redirect";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { Button, LinkButton } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { APIError, fetchApi } from "@/util/api";
import {
  AuthProvider,
  checkIsAuthProvider,
  getRedirectFromState,
} from "@/util/oauth";
import { getPostAuthURL } from "@/util/welcome";

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

const SamlLinkConfirmationSchema = z.object({
  error: z.object({
    code: z.literal("SAML_LINK_CONFIRMATION_REQUIRED"),
    teamName: z.string(),
    state: z.string(),
  }),
});

/**
 * The team a signed-in user is asked to link their account to, and the state
 * the server bound to this browser for the confirmation.
 */
function getSamlLinkConfirmation(error: unknown) {
  if (!(error instanceof APIError)) {
    return null;
  }
  const parsed = SamlLinkConfirmationSchema.safeParse(error.data);
  return parsed.success ? parsed.data.error : null;
}

async function exchangeCode(input: {
  provider: AuthProvider;
  code: string;
  state: string;
  redirect: string;
  confirmLink?: true;
}) {
  const data = await fetchApi<{ creation: boolean; hasAutoInvite: boolean }>(
    `/auth/${input.provider}`,
    {
      data: {
        code: input.code,
        state: input.state,
        confirmLink: input.confirmLink,
      },
    },
  );
  // The server set the session cookie on the response. Do a full
  // navigation so the app re-bootstraps as the logged-in user.
  window.location.replace(
    getPostAuthURL({
      creation: data.creation,
      hasAutoInvite: data.hasAutoInvite,
      redirect: input.redirect,
    }),
  );
}

function SamlLinkConfirmation(props: {
  teamName: string;
  cancelHref: string;
  onConfirm: () => Promise<void>;
}) {
  const { teamName } = props;
  return (
    <Layout>
      <Container className="mt-12 max-w-md">
        <Helmet>
          <title>Link single sign-on</title>
        </Helmet>
        <Alert>
          <AlertTitle>
            Link your Argos account to {teamName} single sign-on?
          </AlertTitle>
          <AlertText>
            Once linked, {teamName} can sign you in to this account through its
            identity provider. Continue only if you started this sign-in.
          </AlertText>
          <AlertActions className="flex justify-center gap-2">
            <LinkButton href={props.cancelHref} variant="secondary">
              Cancel
            </LinkButton>
            <Button onAsyncAction={props.onConfirm}>Link account</Button>
          </AlertActions>
        </Alert>
      </Container>
    </Layout>
  );
}

function AuthCallback(props: { provider: AuthProvider }) {
  const { provider } = props;
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const redirectUri = state ? getRedirectFromState(state) : null;
  const [authError, setAuthError] = useState<Error | null>(null);
  const [samlLinkConfirmation, setSamlLinkConfirmation] = useState<{
    teamName: string;
    state: string;
  } | null>(null);
  useEffect(() => {
    if (!code || !state || !redirectUri) {
      return;
    }

    exchangeCode({ provider, code, state, redirect: redirectUri }).catch(
      (error) => {
        const confirmation = getSamlLinkConfirmation(error);
        if (confirmation) {
          setSamlLinkConfirmation(confirmation);
          return;
        }
        setAuthError(error);
      },
    );
  }, [code, state, provider, redirectUri]);

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

  if (samlLinkConfirmation) {
    return (
      <SamlLinkConfirmation
        teamName={samlLinkConfirmation.teamName}
        cancelHref={redirectUri}
        onConfirm={() =>
          exchangeCode({
            provider,
            code,
            state: samlLinkConfirmation.state,
            redirect: redirectUri,
            confirmLink: true,
          })
        }
      />
    );
  }

  return null;
}

function ErrorFallback(props: { error: unknown }) {
  const { error } = props;
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  if (auth.status === "authenticated") {
    const state = searchParams.get("state");
    const redirectUri = state ? getRedirectFromState(state) : null;
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
      fallback={({ error }) => <ErrorFallback error={error} />}
    >
      <AuthCallback provider={provider} />
    </Sentry.ErrorBoundary>
  );
}
