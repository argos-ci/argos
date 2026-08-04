import { createContext, use, useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/react";
import Cookie from "js-cookie";

import { config } from "@/config";
import { graphql } from "@/gql";

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
  /** Nullable in the schema, but never null for `me` — the viewer owns it. */
  staff: boolean | null;
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
  /**
   * True while `me` is still resolving a session the hint says exists — the
   * account is unknown but is expected to arrive. Distinguishing this from
   * "resolved, and there is no user" is what lets the shell render optimistically
   * instead of flashing logged-out UI.
   */
  loading: boolean;
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
      staff
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

  // Passed through unchanged: rebuilding the object here would give the
  // context a new identity on every render.
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

  // Resolving only matters while we expect a user: with no hint the query never
  // runs, so the account is authoritatively null from the first paint.
  const resolving = loggedInHint && loading && !data;

  const value = useMemo<AuthContextValue>(
    () => ({ account, loading: resolving }),
    [account, resolving],
  );

  // Children render immediately, before `me` resolves. Every route's data
  // fetching therefore starts on the first paint rather than one round trip
  // later; the few components that truly need a resolved account suspend
  // locally via `useAssertAuthTokenPayload`.
  return <AuthContext value={value}>{children}</AuthContext>;
};

function useAuth() {
  const value = use(AuthContext);
  invariant(value, "useAuth must be used within AuthProvider");
  return value;
}

/**
 * Account plus the "still resolving" flag, for UI that wants to render a
 * placeholder in the gap rather than either logged-in or logged-out UI.
 */
export function useAuthState(): AuthContextValue {
  return useAuth();
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

/**
 * For components that cannot render without knowing the viewer. Suspends until
 * `me` resolves instead of blocking the whole app: Apollo deduplicates against
 * the request the provider already has in flight, so this costs no extra
 * round trip — only the subtree that needs the account waits for it.
 */
export function useAssertAuthTokenPayload(): JWTData {
  const { data } = useSuspenseQuery(MeQuery);
  if (!data.me) {
    throw new AuthenticationError("Invalid auth token payload");
  }
  return { account: data.me };
}

export function useIsLoggedIn() {
  const { account, loading } = useAuth();
  // While `me` is in flight we trust the hint, so the shell renders its
  // authenticated form straight away instead of flashing a login button and
  // then swapping it for an avatar.
  return loading || account !== null;
}

export function logout(options?: { redirectTo?: string }) {
  const redirectTo = options?.redirectTo ?? window.location.pathname;
  const search = redirectTo ? `?r=${encodeURIComponent(redirectTo)}` : "";
  // POST (with the CSRF header) so logout can't be forged via a cross-site
  // navigation; redirect to login regardless of the request outcome.
  void fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "X-Argos-CSRF": "1" },
  }).finally(() => {
    window.location.replace(`/login${search}`);
  });
}
