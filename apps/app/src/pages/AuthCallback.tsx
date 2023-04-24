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
  const { setToken } = useAuth();
  useEffect(() => {
    api
      .post("/auth/github", { code })
      .then((result) => {
        setToken(result.data.jwt);
        navigate(r || (state ? decodeURIComponent(state) : "/"));
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }, [code, navigate, r, setToken, state]);

  return null;
};
