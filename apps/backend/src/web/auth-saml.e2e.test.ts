import { invariant } from "@argos/util/invariant";
import * as samlify from "samlify";
import request from "supertest";
import { test as base, describe, expect } from "vitest";

import { getSamlSpMetadata } from "@/auth/saml";
import { TeamSamlConfig, type Account } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";

import {
  samlTestIdpCertificate,
  samlTestIdpPrivateKey,
} from "./__fixtures__/saml-test-idp";
import router from "./auth-saml";
import { createTestApp } from "./test-util";

const app = createTestApp(router);

const IDP_ENTITY_ID = "https://idp.example.com/entity";
const IDP_SSO_URL = "https://idp.example.com/sso";
const REJECTED_RESPONSE_ERROR =
  "Argos could not verify the SAML response from your identity provider. Ask a team admin to check the SAML settings.";

const test = base.extend<{ teamAccount: Account }>({
  teamAccount: async ({}, use) => {
    await setupDatabase();
    const teamAccount = await factory.TeamAccount.create();
    const plan = await factory.Plan.create({
      samlIncluded: true,
      usageBased: false,
    });
    await factory.Subscription.create({
      accountId: teamAccount.id,
      planId: plan.id,
      status: "active",
      endDate: null,
    });
    await TeamSamlConfig.query().insert({
      accountId: teamAccount.id,
      idpEntityId: IDP_ENTITY_ID,
      ssoUrl: IDP_SSO_URL,
      signingCertificate: samlTestIdpCertificate,
      enabled: true,
      enforced: false,
    });
    await use(teamAccount);
  },
});

const idp = samlify.IdentityProvider({
  entityID: IDP_ENTITY_ID,
  privateKey: samlTestIdpPrivateKey,
  signingCert: samlTestIdpCertificate,
  singleSignOnService: [
    {
      Binding: samlify.Constants.namespace.binding.redirect,
      Location: IDP_SSO_URL,
    },
  ],
});

type LoginRequestInfo = Parameters<
  samlify.IdentityProviderInstance["createLoginResponse"]
>[1];

/**
 * The team's identity provider, answering the SP described by the metadata
 * Argos publishes. It signs the assertion when the metadata asks for it, and
 * the whole Response when `wantMessageSigned` is set. Most IdPs sign only the
 * assertion by default.
 */
function createIdp(
  teamSlug: string,
  signed: "assertion" | "response" | "both" = "assertion",
) {
  const metadata = getSamlSpMetadata(teamSlug);
  invariant(metadata.includes('WantAssertionsSigned="true"'));
  const sp = samlify.ServiceProvider({
    metadata: metadata.replace(
      'WantAssertionsSigned="true"',
      `WantAssertionsSigned="${signed !== "response"}"`,
    ),
    wantMessageSigned: signed !== "assertion",
  });

  return {
    async parseLoginRequest(redirectUrl: string): Promise<LoginRequestInfo> {
      const query = Object.fromEntries(new URL(redirectUrl).searchParams);
      const { extract } = await idp.parseLoginRequest(sp, "redirect", {
        query,
      });
      return { extract };
    },
    async createLoginResponse(requestInfo: LoginRequestInfo = { extract: {} }) {
      const { context } = await idp.createLoginResponse(
        sp,
        requestInfo,
        "post",
        { email: "jane@example.com" },
      );
      return Buffer.from(context, "base64").toString("utf8");
    },
  };
}

function postResponse(args: {
  teamSlug: string;
  samlResponse: string;
  relayState?: string;
}) {
  return request(app)
    .post(`/auth/saml/${args.teamSlug}/acs`)
    .type("form")
    .send({
      SAMLResponse: Buffer.from(args.samlResponse).toString("base64"),
      RelayState: args.relayState,
    });
}

function getRedirect(res: request.Response) {
  expect(res.status).toBe(302);
  const location = res.headers["location"];
  invariant(location, "Expected a redirect location");
  return new URL(location);
}

function expectSignedIn(res: request.Response) {
  const redirect = getRedirect(res);
  expect(redirect.pathname).toBe("/auth/saml/callback");
  expect(redirect.searchParams.get("code")).toEqual(expect.any(String));
}

function expectRejected(res: request.Response) {
  const redirect = getRedirect(res);
  expect(redirect.pathname).toBe("/login");
  expect(redirect.searchParams.get("error")).toBe(REJECTED_RESPONSE_ERROR);
}

describe("SAML assertion consumer service", () => {
  test.for([
    { signed: "assertion", what: "only the assertion" },
    { signed: "response", what: "only the Response" },
    { signed: "both", what: "the Response and the assertion" },
  ] as const)(
    "signs in when the IdP signs $what",
    async ({ signed }, { teamAccount }) => {
      const teamIdp = createIdp(teamAccount.slug, signed);
      const loginRes = await request(app)
        .get(`/auth/saml/${teamAccount.slug}/login`)
        .expect(302);
      const redirectUrl = loginRes.headers["location"];
      invariant(redirectUrl, "Expected a redirect to the IdP");
      const relayState = new URL(redirectUrl).searchParams.get("RelayState");
      invariant(relayState, "Expected a RelayState");

      const res = await postResponse({
        teamSlug: teamAccount.slug,
        samlResponse: await teamIdp.createLoginResponse(
          await teamIdp.parseLoginRequest(redirectUrl),
        ),
        relayState,
      });

      expectSignedIn(res);
    },
  );

  test("rejects a replayed assertion", async ({ teamAccount }) => {
    const samlResponse = await createIdp(
      teamAccount.slug,
    ).createLoginResponse();

    expectSignedIn(
      await postResponse({ teamSlug: teamAccount.slug, samlResponse }),
    );
    expectRejected(
      await postResponse({ teamSlug: teamAccount.slug, samlResponse }),
    );
    // Signatures ignore comments, so this copy still verifies.
    expectRejected(
      await postResponse({
        teamSlug: teamAccount.slug,
        samlResponse: samlResponse.replace(
          "<saml:Assertion",
          '<!--<saml:Assertion ID="_unused-id" --><saml:Assertion',
        ),
      }),
    );
  });

  test("rejects a response to a request this login did not start", async ({
    teamAccount,
  }) => {
    const samlResponse = await createIdp(teamAccount.slug).createLoginResponse({
      extract: { request: { id: "_another-login-request" } },
    });

    // The outer InResponseTo is not covered by the assertion signature, so it
    // cannot pass the response off as IdP-initiated.
    expectRejected(
      await postResponse({
        teamSlug: teamAccount.slug,
        samlResponse: samlResponse.replace(
          /(<samlp:Response\b[^>]*?) InResponseTo="[^"]*"/,
          "$1",
        ),
      }),
    );
  });

  test("rejects an unsigned response", async ({ teamAccount }) => {
    const samlResponse = await createIdp(
      teamAccount.slug,
    ).createLoginResponse();

    expectRejected(
      await postResponse({
        teamSlug: teamAccount.slug,
        samlResponse: samlResponse.replace(
          /<(?:\w+:)?Signature\b[\s\S]*?<\/(?:\w+:)?Signature>/g,
          "",
        ),
      }),
    );
  });
});
