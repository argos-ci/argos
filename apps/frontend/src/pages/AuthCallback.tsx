import { useEffect } from "react";
import * as Sentry from "@sentry/browser";
import axios, { isAxiosError } from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import config from "@/config";
import { AuthProvider, useAuth } from "@/containers/Auth";
import { UniversalNavigate } from "@/containers/Redirect";

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
  return "/login";
}

function AuthCallback(props: { provider: AuthProvider }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const r = params.get("r");
  const error = params.get("error");
  const { setToken, token } = useAuth();
  useEffect(() => {
    if (!code) {
      return;
    }
    api
      .post(`/auth/${props.provider}`, { code, r })
      .then((result) => {
        setToken(result.data.jwt);
      })
      .catch((error) => {
        Sentry.captureException(error);
        navigate(getLoginUrl(error));
      });
  }, [props.provider, r, code, setToken, navigate]);
  if (token) {
    const redirectUrl = r || (state ? decodeURIComponent(state) : "/");
    return <UniversalNavigate to={redirectUrl} replace />;
  }
  if (error) {
    return <UniversalNavigate to="/login" replace />;
  }
  return null;
}

function checkIsAuthProvider(provider: string): provider is AuthProvider {
  return Object.values(AuthProvider).includes(provider as AuthProvider);
}

export function Component() {
  const params = useParams();
  if (!params.provider || !checkIsAuthProvider(params.provider)) {
    return <NotFound />;
  }

  return <AuthCallback provider={params.provider} />;
}
