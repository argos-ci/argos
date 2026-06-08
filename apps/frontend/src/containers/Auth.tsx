import { createContext, use, useEffect, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/react";
import Cookie from "js-cookie";

import { config } from "@/config";
import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

/**
 * Zero-privilege render hint set (and cleared) by the server alongside the
 * HttpOnly session cookie. Lets us know synchronously whether to expect a
 * logged-in user. Never a security input — the real credential is the HttpOnly
 * `argos_session` cookie, which JS cannot read.
 */
const LOGGED_IN_COOKIE = "argos_logged_in";

type AuthAccount = {
  id: string;
  slug: string;
  name: string | null;
};

/**
 * Shape exposed to consumers. Named `JWTData` for historical reasons (auth used
 * to be a client-readable JWT); the credential is now a server-side session.
 */
export type JWTData = {
  account: AuthAccount;
};

interface AuthContextValue {
  account: AuthAccount | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLoggedInHint(): boolean {
  return Cookie.get(LOGGED_IN_COOKIE) === "1";
}

function clearLoggedInHint(): void {
  Cookie.remove(LOGGED_IN_COOKIE, { domain: config.session.domain });
}

const MeQuery = graphql(`
  query Auth_me {
    me {
      id
      slug
      name
    }
  }
`);

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const loggedInHint = readLoggedInHint();
  // Resolve the current account from the session cookie. Skipped entirely when
  // the hint says we're logged out, so anonymous pages render immediately.
  const { data, loading } = useQuery(MeQuery, { skip: !loggedInHint });

  const account = data?.me ?? null;

  useEffect(() => {
    // Reconcile a stale hint: the cookie claims logged-in but the server has no
    // valid session. Drop the hint so the UI reflects reality.
    if (loggedInHint && data && data.me === null) {
      clearLoggedInHint();
    }
  }, [loggedInHint, data]);

  useEffect(() => {
    if (account) {
      Sentry.setUser({ id: account.id, username: account.slug });
    } else {
      Sentry.setUser(null);
    }
  }, [account]);

  const value = useMemo<AuthContextValue>(() => ({ account }), [account]);

  // Hold rendering until we know who the user is, so consumers of
  // `useAssertAuthTokenPayload` always observe a resolved account.
  if (loggedInHint && loading && !data) {
    return <PageLoader />;
  }

  return <AuthContext value={value}>{children}</AuthContext>;
};

function useAuth() {
  const value = use(AuthContext);
  invariant(value, "useAuth must be used within AuthProvider");
  return value;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function useAuthTokenPayload(): JWTData | null {
  const { account } = useAuth();
  return account ? { account } : null;
}

export function useAssertAuthTokenPayload(): JWTData {
  const payload = useAuthTokenPayload();
  if (!payload) {
    throw new AuthenticationError("Invalid auth token payload");
  }
  return payload;
}

export function useIsLoggedIn() {
  return useAuth().account !== null;
}

export function logout(options?: { redirectTo?: string }) {
  const redirectTo = options?.redirectTo ?? window.location.pathname;
  const search = redirectTo ? `?r=${encodeURIComponent(redirectTo)}` : "";
  window.location.replace(`/auth/logout${search}`);
}
