import request from "supertest";

import { getCallbackCookieName } from "@/auth/callback-binding";
import { createSamlAuthCode } from "@/auth/saml";
import type { Account } from "@/database/models";

import { createTestApp } from "../test-util";
import router from "./auth";

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
  const state = "saml-state";
  const req = request(createTestApp(router)).post("/auth/saml");
  if (!input.fromAnotherBrowser) {
    req.set("Cookie", `${getCallbackCookieName("saml")}=${state}`);
  }
  return req.send({ code, state });
}
