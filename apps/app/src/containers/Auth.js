import { createContext, useCallback, useContext, useMemo } from "react";

import { useStoreState } from "./Store";

const AuthContext = createContext();

function AuthProvider({ children }) {
  const { user } = window.clientData;
  let email = null;
  if (user) {
    email = user.email;
  }
  const [token, setToken] = useStoreState("token", email);
  const value = useMemo(() => ({ token, setToken }), [token, setToken]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const AuthInitializer = AuthProvider;

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthToken() {
  const { token } = useAuth();
  return token || null;
}

export function useLogout() {
  const { setToken } = useAuth();
  return useCallback(() => setToken(null), [setToken]);
}
