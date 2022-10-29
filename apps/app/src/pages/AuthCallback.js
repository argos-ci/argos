import { useNavigate, useLocation } from "react-router-dom";
import qs from "query-string";
import axios from "axios";
import { useAuth } from "../containers/Auth";
import { useEffect } from "react";

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
});

export function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { code, r } = qs.parse(location.search);
  const { setToken } = useAuth();
  useEffect(() => {
    api
      .post("/auth/github", { code })
      .then((result) => {
        setToken(result.data.access_token);
        navigate(r || "/");
      })
      .catch((error) => {
        console.error(error); // eslint-disable-line no-console
      });
  }, [code, navigate, r, setToken]);

  return null;
}
