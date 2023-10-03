import axios from "axios";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Sentry from "@sentry/browser";

import { AuthProvider, useAuth } from "@/containers/Auth";
import { UniversalNavigate } from "@/containers/Redirect";

const api = axios.create({
  baseURL: process.env["API_BASE_URL"] as string,
});

export type AuthCallbackProps = {
  provider: AuthProvider;
};

export const AuthCallback = (props: AuthCallbackProps) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const r = params.get("r");
  const error = params.get("error");
  const { setToken, token } = useAuth();
  useEffect(() => {
    if (!code) return;
    api
      .post(`/auth/${props.provider}`, { code, r })
      .then((result) => {
        setToken(result.data.jwt);
      })
      .catch((error) => {
        Sentry.captureException(error);
        navigate("/login");
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
