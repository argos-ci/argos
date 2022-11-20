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
  return useContext(AuthContext);
}

export function useAuthToken() {
  const value = useAuth();
  if (!value) {
    throw new Error("useAuthToken must be used within AuthProvider");
  }
  return value.token;
}

export function useLogout() {
  const value = useAuth();
  if (!value) {
    throw new Error("useLogout must be used within AuthProvider");
  }
  const { setToken } = value;
  return useCallback(() => setToken(null), [setToken]);
}
