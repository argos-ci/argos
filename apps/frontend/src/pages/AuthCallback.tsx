import { useEffect, useState } from "react";
import * as Sentry from "@sentry/react";
import axios, { isAxiosError } from "axios";
import { useParams, useSearchParams } from "react-router-dom";

import config from "@/config";
import { useAuth } from "@/containers/Auth";
import { UniversalNavigate } from "@/containers/Redirect";
import { useLiveRef } from "@/ui/useLiveRef";
import {
  AuthProvider,
  checkIsAuthProvider,
  getRedirectFromState,
} from "@/util/oauth";

import { NotFound } from "./NotFound";

const api = axios.create({
  baseURL: config.get("api.baseUrl"),
});

function getLoginUrl(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.data?.error?.message) {
      return `/login?error=${encodeURIComponent(
        error.response.data.error.message,
      )}`;
    }
  }
  if (error instanceof Error) {
    return `/login?error=${encodeURIComponent(error.message)}`;
  }
  return "/login";
}

function AuthCallback(props: { provider: AuthProvider }) {
  const { provider } = props;
  const [params] = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");
  if (!state) {
    throw new Error("Missing state");
  }
  if (!code) {
    throw new Error("Missing code");
  }
  const redirectUri = getRedirectFromState({ state, provider });
  const { setToken, token } = useAuth();
  const liveRef = useLiveRef({ setToken, token, provider });
  const [authError, setAuthError] = useState<Error | null>(null);
  if (authError) {
    throw authError;
  }
  useEffect(() => {
    const { setToken, token, provider } = liveRef.current;
    api
      .post(
        `/auth/${provider}`,
        { code },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((result) => {
        setToken(result.data.jwt);
      })
      .catch((error) => {
        setAuthError(error);
      });
  }, [code, liveRef]);
  if (token) {
    return <UniversalNavigate to={redirectUri} replace />;
  }
  if (error) {
    return <UniversalNavigate to="/login" replace />;
  }
  return null;
}

/** @route */
export function Component() {
  const params = useParams();
  if (!params.provider || !checkIsAuthProvider(params.provider)) {
    return <NotFound />;
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <UniversalNavigate to={getLoginUrl(error)} replace />
      )}
    >
      <AuthCallback provider={params.provider} />
    </Sentry.ErrorBoundary>
  );
}
