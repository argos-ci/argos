import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import qs from "query-string";
import axios from "axios";
import { useAuth } from "../containers/Auth";

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
});

export function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { code } = qs.parse(location.search);
  const { setToken } = useAuth();
  React.useEffect(() => {
    api
      .post("/auth/github", { code })
      .then((result) => {
        setToken(result.data.access_token);
        navigate("/");
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }, [code, navigate, setToken]);

  return null;
}
