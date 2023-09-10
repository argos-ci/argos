import Cookie from "js-cookie";
import jwt_decode from "jwt-decode";
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

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [token, setStateToken] = useState<string | null>(() => {
    return Cookie.get(COOKIE_NAME) ?? null;
  });
  const setToken = useCallback((newToken: Token) => {
    setStateToken(newToken);
    if (newToken === null) {
      Cookie.remove(COOKIE_NAME, {
        domain: COOKIE_DOMAIN,
      });
    } else {
      Cookie.set(COOKIE_NAME, newToken, {
        domain: COOKIE_DOMAIN,
        expires: 60,
      });
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

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function useAssertAuthTokenPayload() {
  const payload = useAuthTokenPayload();
  if (!payload) {
    throw new AuthenticationError("Missing auth token");
  }
  return payload;
}

export function useIsLoggedIn() {
  return useAuthTokenPayload() !== null;
}

export function useRedirectToLogin() {
  return useCallback(() => {
    window.location.replace(
      `/login?r=${encodeURIComponent(window.location.pathname)}`,
    );
  }, []);
}

export function useLogout() {
  const { setToken } = useAuth();
  const redirectToLogin = useRedirectToLogin();
  return useCallback(() => {
    setToken(null);
    redirectToLogin();
  }, [setToken, redirectToLogin]);
}
