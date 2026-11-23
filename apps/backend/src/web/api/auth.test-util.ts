import request from "supertest";

import { getCallbackCookieName } from "@/auth/callback-binding";
import { createSamlAuthCode } from "@/auth/saml";
import type { Account } from "@/database/models";

import { createTestApp } from "../test-util";
import router from "./auth";

/**
 * What the callback page does with the code the ACS endpoint hands it, once
 * `teamAccount`'s IdP has vouched for `email`, or with a `code` and `state`
 * the server issued since. It runs in the browser the state is bound to,
 * unless `fromAnotherBrowser`, signed in with `sessionCookie` if any.
 */
export async function exchangeSamlCode(
  input: (
    | { teamAccount: Account; email: string; ssoSubject: string }
    | { code: string }
  ) & {
    state?: string;
    sessionCookie?: string | undefined;
    confirmLink?: true;
    fromAnotherBrowser?: boolean;
  },
): Promise<request.Response> {
  const code =
    "code" in input
      ? input.code
      : await createSamlAuthCode({
          teamAccountId: input.teamAccount.id,
          email: input.email,
          ssoSubject: input.ssoSubject,
        });
  const state =
    input.state ??
    Buffer.from(
      JSON.stringify({ nonce: "saml-nonce", redirect: "/" }),
    ).toString("base64");
  const cookies = input.sessionCookie ? [input.sessionCookie] : [];
  if (!input.fromAnotherBrowser) {
    cookies.push(`${getCallbackCookieName("saml")}=${state}`);
  }
  return request(createTestApp(router))
    .post("/auth/saml")
    .set("X-Argos-CSRF", "1")
    .set("Cookie", cookies)
    .send({ code, state, confirmLink: input.confirmLink });
}
