import jwt_decode from "jwt-decode";
import { createContext, useCallback, useContext, useMemo } from "react";

import { useStoreState } from "./Store";

type Token = null | string;

interface AuthContextValue {
  token: Token;
  setToken: React.Dispatch<React.SetStateAction<Token>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useStoreState<Token>("token", null);
  const value = useMemo(() => ({ token, setToken }), [token, setToken]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}

type JWTData = {
  version: number;
  account: {
    id: string;
    slug: string;
    name: string | null;
  };
};

const jwtDecode = (t: string) => {
  try {
    const value = jwt_decode<JWTData>(t);
    if (value?.version !== 1) return null;
    return value as JWTData;
  } catch (e) {
    return null;
  }
};

export function useAuthToken() {
  const { token } = useAuth();
  return token;
}

export function useAuthTokenPayload() {
  const token = useAuthToken();
  return token ? jwtDecode(token) : null;
}

export function useIsLoggedIn() {
  return useAuthTokenPayload() !== null;
}

export function useLogout() {
  const { setToken } = useAuth();
  return useCallback(() => {
    setToken(null);
    window.location.href = "https://argos-ci.com";
  }, [setToken]);
}
