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

export function useAuthToken() {
  const { token } = useAuth();
  return token;
}

export function useLogout() {
  const { setToken } = useAuth();
  return useCallback(() => setToken(null), [setToken]);
}
