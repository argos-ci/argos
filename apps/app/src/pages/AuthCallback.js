import axios from "axios";
import { parse as parseQs } from "query-string";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/containers/Auth";

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
});

export function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { code, r } = parseQs(location.search);
  const { setToken } = useAuth();
  useEffect(() => {
    api
      .post("/auth/github", { code })
      .then((result) => {
        setToken(result.data.jwt);
        navigate(r || "/");
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }, [code, navigate, r, setToken]);

  return null;
}
