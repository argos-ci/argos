import axios from "axios";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import * as Sentry from "@sentry/browser";

import { AuthProvider, useAuth } from "@/containers/Auth";

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
  const { setToken, token } = useAuth();
  useEffect(() => {
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
  // When the token is present, we want to redirect.
  useEffect(() => {
    if (token) {
      navigate(r || (state ? decodeURIComponent(state) : "/"));
    }
  }, [navigate, r, state, token]);

  return null;
};
