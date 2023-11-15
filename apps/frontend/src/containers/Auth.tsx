import Cookie from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export enum AuthProvider {
  GitHub = "github",
  GitLab = "gitlab",
}

type Token = null | string;

interface AuthContextValue {
  token: Token;
  setToken: (token: Token) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const COOKIE_NAME = "argos_jwt";
const COOKIE_DOMAIN =
  process.env["NODE_ENV"] === "production" ? ".argos-ci.com" : "";

export const readAuthTokenCookie = () => {
  return Cookie.get(COOKIE_NAME) ?? null;
};

export const removeAuthTokenCookie = () => {
  Cookie.remove(COOKIE_NAME, {
    domain: COOKIE_DOMAIN,
  });
};

export const setAuthTokenCookie = (token: string) => {
  Cookie.set(COOKIE_NAME, token, {
    domain: COOKIE_DOMAIN,
    expires: 60,
  });
};

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [token, setStateToken] = useState<string | null>(() =>
    readAuthTokenCookie(),
  );
  const setToken = useCallback((newToken: Token) => {
    setStateToken(newToken);
    if (newToken === null) {
      removeAuthTokenCookie();
    } else {
      setAuthTokenCookie(newToken);
    }
  }, []);
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

export type JWTData = {
  version: number;
  account: {
    id: string;
    slug: string;
    name: string | null;
  };
};

export const decodeAuthToken = (t: string) => {
  try {
    const value = jwtDecode<JWTData>(t);
    if (value?.version !== 1) return null;
    return value as JWTData;
  } catch (e) {
    return null;
  }
};

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function useAuthToken() {
  const { token } = useAuth();
  return token;
}

export function useAssertAuthToken() {
  const token = useAuthToken();
  if (!token) {
    throw new AuthenticationError("Missing auth token");
  }
  return token;
}

export function useAuthTokenPayload() {
  const token = useAuthToken();
  return token ? decodeAuthToken(token) : null;
}

export function useAssertAuthTokenPayload() {
  const payload = useAuthTokenPayload();
  if (!payload) {
    throw new AuthenticationError("Invalid auth token payload");
  }
  return payload;
}

export function useIsLoggedIn() {
  return useAuthTokenPayload() !== null;
}

export function redirectToLogin() {
  window.location.replace(
    `/login?r=${encodeURIComponent(window.location.pathname)}`,
  );
}

export function logout() {
  removeAuthTokenCookie();
  redirectToLogin();
}
