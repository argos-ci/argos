import { useEffect } from "react";
import * as Sentry from "@sentry/browser";
import axios, { isAxiosError } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

import config from "@/config";
import { AuthProvider, useAuth } from "@/containers/Auth";
import { UniversalNavigate } from "@/containers/Redirect";

const api = axios.create({
  baseURL: config.get("api.baseUrl"),
});

const getLoginUrl = (error: unknown) => {
  if (isAxiosError(error)) {
    if (error.response?.data?.error?.message) {
      return `/login?error=${encodeURIComponent(
        error.response.data.error.message,
      )}`;
    }
  }
  return "/login";
};

export const AuthCallback = (props: { provider: AuthProvider }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const r = params.get("r");
  const error = params.get("error");
  const { setToken, token } = useAuth();
  useEffect(() => {
    // @ts-ignore
    if (typeof window.gtag !== "function") return;
    // @ts-ignore
    window.gtag("event", "conversion", {
      send_to: "AW-847457408/E_X0CL7Uz-8YEIDZjJQD",
      value: 1.0,
      currency: "EUR",
    });
  }, []);
  useEffect(() => {
    if (!code) return;
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
};
