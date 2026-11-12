import request from "supertest";

import { createSamlAuthCode } from "@/auth/saml";
import type { Account } from "@/database/models";

import { createTestApp } from "../test-util";
import router from "./auth";

/**
 * What the callback page does with the code the ACS endpoint hands it, once
 * `teamAccount`'s IdP has vouched for `email`.
 */
export async function exchangeSamlCode(input: {
  teamAccount: Account;
  email: string;
  ssoSubject: string;
}): Promise<request.Response> {
  const code = await createSamlAuthCode({
    teamAccountId: input.teamAccount.id,
    email: input.email,
    ssoSubject: input.ssoSubject,
  });
  return request(createTestApp(router)).post("/auth/saml").send({ code });
}
