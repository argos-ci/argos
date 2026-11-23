import request from "supertest";

import { getCallbackCookieName } from "@/auth/callback-binding";
import { createSamlAuthCode } from "@/auth/saml";
import type { Account } from "@/database/models";

import { createTestApp } from "../test-util";
import router from "./auth";

/**
 * A state as the ACS endpoint issues it, and the cookie that binds it to the
 * browser it redirects.
 */
export function bindSamlCallbackState() {
  const state = Buffer.from(
    JSON.stringify({ nonce: "saml-nonce", redirect: "/" }),
  ).toString("base64");
  return { state, cookie: `${getCallbackCookieName("saml")}=${state}` };
}

/**
 * What the callback page does with the code the ACS endpoint hands it, once
 * `teamAccount`'s IdP has vouched for `email`. It runs in the browser the ACS
 * bound the state to, unless `fromAnotherBrowser`.
 */
export async function exchangeSamlCode(input: {
  teamAccount: Account;
  email: string;
  ssoSubject: string;
  fromAnotherBrowser?: boolean;
}): Promise<request.Response> {
  const code = await createSamlAuthCode({
    teamAccountId: input.teamAccount.id,
    email: input.email,
    ssoSubject: input.ssoSubject,
  });
  const { state, cookie } = bindSamlCallbackState();
  const req = request(createTestApp(router)).post("/auth/saml");
  if (!input.fromAnotherBrowser) {
    req.set("Cookie", cookie);
  }
  return req.send({ code, state });
}
