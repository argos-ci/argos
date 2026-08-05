import { createContext, use, useEffect, useMemo } from "react";
import { useQuery, useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/react";
import Cookie from "js-cookie";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";

/**
 * Zero-privilege render hint set (and cleared) by the server alongside the
 * HttpOnly session cookie. Lets us know synchronously whether to expect a
 * logged-in user. Never a security input — the real credential is the HttpOnly
 * `argos_session` cookie, which JS cannot read.
 */
const LOGGED_IN_COOKIE = "argos_logged_in";

/**
 * Derived from the query rather than restated, so adding a field to `Auth_me`
 * is enough to expose it to consumers.
 *
 * `staff` is nullable in the schema but never null for `me` — the viewer owns it.
 */
export type AuthAccount = NonNullable<DocumentType<typeof MeQuery>["me"]>;

/**
 * Who the viewer is.
 *
 * There is no loading case: the server sets the `argos_logged_in` hint alongside
 * the session cookie, so whether *someone* is signed in is known synchronously,
 * on the first render. Only their details have to be fetched — hence a null
 * `account` on the `authenticated` case, meaning "signed in, details pending".
 *
 * That split is what keeps the app fast and correct at once. Anything deciding
 * where to send the viewer reads `status` and gets an immediate answer, with no
 * loader; anything needing the account itself either handles null or calls
 * {@link useAssertAuthAccount}, and waits only for that subtree.
 *
 * A hint can be stale — the session may have expired or been revoked. `me` then
 * resolves to null, this becomes `anonymous`, and the hint is cleared, so the
 * state is self-correcting rather than merely optimistic.
 */
export type AuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; account: AuthAccount | null };

const AuthContext = createContext<AuthState | null>(null);

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
      avatar {
        ...AccountAvatarFragment
      }
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
  const { data } = useQuery(MeQuery, { skip: !loggedInHint });

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

  const value = useMemo<AuthState>(() => {
    // No hint: the query never runs, so this is authoritative immediately.
    if (!loggedInHint) {
      return { status: "anonymous" };
    }
    // Hint, but no answer yet: signed in, details still on their way.
    if (!data) {
      return { status: "authenticated", account: null };
    }
    // Derived from `data` rather than the hint alone, so a stale hint becomes
    // anonymous on the render the answer arrives. Clearing the cookie happens in
    // an effect, which would not re-render on its own.
    return data.me
      ? { status: "authenticated", account: data.me }
      : { status: "anonymous" };
  }, [loggedInHint, data]);

  // Children render immediately, before `me` resolves. Every route's data
  // fetching therefore starts on the first paint rather than one round trip
  // later; the few components that cannot render without the viewer suspend
  // locally via `useAssertAuthAccount`.
  return <AuthContext value={value}>{children}</AuthContext>;
};

/**
 * The viewer's {@link AuthState}. The single way to read who is signed in.
 */
export function useAuth(): AuthState {
  const value = use(AuthContext);
  invariant(value, "useAuth must be used within AuthProvider");
  return value;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * The viewer, for components that cannot render without knowing them.
 *
 * Suspends until `me` resolves rather than blocking the whole app: Apollo
 * deduplicates against the request the provider already has in flight, so this
 * costs no extra round trip — only the subtree that needs the account waits.
 */
export function useAssertAuthAccount(): AuthAccount {
  const { data } = useSuspenseQuery(MeQuery);
  if (!data.me) {
    throw new AuthenticationError("Invalid auth token payload");
  }
  return data.me;
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
