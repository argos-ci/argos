import axios from "axios";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/containers/Auth";

const api = axios.create({
  baseURL: process.env["API_BASE_URL"] as string,
});

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  const r = params.get("r");
  const { setToken, token } = useAuth();
  useEffect(() => {
    api
      .post("/auth/github", { code })
      .then((result) => {
        setToken(result.data.jwt);
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }, [code, setToken]);
  // When the token is present, we want to redirect.
  useEffect(() => {
    if (token) {
      navigate(r || (state ? decodeURIComponent(state) : "/"));
    }
  }, [navigate, r, state, token]);

  return null;
};
