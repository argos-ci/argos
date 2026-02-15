import * as samlify from "samlify";
import z from "zod";

import config from "@/config";
import type { Account, TeamSamlConfig } from "@/database/models";
import { generateRandomHexString } from "@/database/services/crypto";
import { boom } from "@/util/error";
import { getRedisClient } from "@/util/redis/client";

const CLOCK_SKEW_SECONDS = 5 * 60;

/**
 * Time allowed to store the login state.
 */
const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Time allowed to exchange a SAML code for a JWT token.
 */
const EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type SamlAttributeValue = string | string[];
type SamlAttributes = Record<string, SamlAttributeValue>;

const SmalLoginStateSchema = z.object({
  nonce: z.string(),
  requestId: z.string(),
  teamSlug: z.string(),
  redirect: z.string(),
});

type SamlLoginState = z.infer<typeof SmalLoginStateSchema>;

const SamlAuthCodePayloadSchema = z.object({
  accountId: z.string(),
  teamSlug: z.string(),
  redirect: z.string(),
});

type SamlAuthCodePayload = z.infer<typeof SamlAuthCodePayloadSchema>;

type SamlResponseExtract = {
  issuer: string;
  audience: string;
  nameId: string | null;
  response: {
    destination: string;
    inResponseTo: string | null;
  };
  conditions: {
    notBefore: string | null;
    notOnOrAfter: string | null;
  };
  attributes: SamlAttributes;
};

/**
 * Attributes to find email in.
 */
const DEFAULT_EMAIL_ATTRIBUTE_KEYS = [
  "email",
  "mail",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  "urn:oid:0.9.2342.19200300.100.1.3",
];

samlify.setSchemaValidator({
  validate: async () => "",
});

function getLoginStateKey(nonce: string) {
  return `saml:login:${nonce}`;
}

function getAuthCodeKey(code: string) {
  return `saml:auth-code:${code}`;
}

function getTeamSamlUrls(teamSlug: string) {
  const baseUrl = config.get("server.url");
  const acsUrl = new URL(`/auth/saml/${teamSlug}/acs`, baseUrl).toString();
  const metadataUrl = new URL(
    `/auth/saml/${teamSlug}/metadata.xml`,
    baseUrl,
  ).toString();
  const entityId = metadataUrl;
  const ssoUrl = new URL(`/login?saml=${teamSlug}`, baseUrl).toString();
  return { acsUrl, metadataUrl, entityId, ssoUrl };
}

function createServiceProvider(args: {
  teamSlug: string;
  relayState: string;
  requestSigned: boolean;
}) {
  const urls = getTeamSamlUrls(args.teamSlug);
  return samlify.ServiceProvider({
    entityID: urls.entityId,
    relayState: args.relayState,
    authnRequestsSigned: args.requestSigned,
    wantAssertionsSigned: true,
    wantMessageSigned: true,
    assertionConsumerService: [
      {
        Binding: samlify.Constants.namespace.binding.post,
        Location: urls.acsUrl,
      },
    ],
    clockDrifts: [-CLOCK_SKEW_SECONDS, CLOCK_SKEW_SECONDS],
  });
}

function createIdentityProvider(config: TeamSamlConfig) {
  if (!config.idpEntityId || !config.ssoUrl) {
    throw boom(400, "SAML IdP is not fully configured.");
  }
  return samlify.IdentityProvider({
    entityID: config.idpEntityId,
    singleSignOnService: [
      {
        Binding: samlify.Constants.namespace.binding.redirect,
        Location: config.ssoUrl,
      },
      {
        Binding: samlify.Constants.namespace.binding.post,
        Location: config.ssoUrl,
      },
    ],
    signingCert: config.signingCertificate,
  });
}

async function saveLoginState(state: SamlLoginState) {
  const redis = await getRedisClient();
  await redis.set(getLoginStateKey(state.nonce), JSON.stringify(state), {
    expiration: {
      type: "PX",
      value: LOGIN_STATE_TTL_MS,
    },
  });
}

async function consumeSamlLoginState(
  nonce: string,
): Promise<SamlLoginState | null> {
  const redis = await getRedisClient();
  const key = getLoginStateKey(nonce);
  const json = await redis.get(key);
  if (!json) {
    return null;
  }
  await redis.del(key);
  return SmalLoginStateSchema.parse(JSON.parse(json));
}

export async function createSamlAuthCode(
  payload: SamlAuthCodePayload,
): Promise<string> {
  const redis = await getRedisClient();
  const code = generateRandomHexString(40);
  await redis.set(getAuthCodeKey(code), JSON.stringify(payload), {
    expiration: {
      type: "PX",
      value: EXCHANGE_CODE_TTL_MS,
    },
  });
  return code;
}

export async function consumeSamlAuthCode(
  code: string,
): Promise<SamlAuthCodePayload | null> {
  const redis = await getRedisClient();
  const key = getAuthCodeKey(code);
  const json = await redis.get(key);
  if (!json) {
    return null;
  }
  await redis.del(key);
  return SamlAuthCodePayloadSchema.parse(JSON.parse(json));
}

function getString(input: string | string[] | null | undefined) {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input) && input.length > 0) {
    const first = input[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

function readExtract(result: { extract: object }): SamlResponseExtract {
  const raw = result.extract as {
    issuer?: string | null;
    audience?: string | null;
    nameID?: string | { value?: string } | null;
    nameId?: string | { value?: string } | null;
    response?: {
      destination?: string | null;
      inResponseTo?: string | null;
    };
    conditions?: {
      notBefore?: string | null;
      notOnOrAfter?: string | null;
    };
    attributes?: SamlAttributes;
  };
  const rawNameId = raw.nameID ?? raw.nameId ?? null;
  const nameId =
    typeof rawNameId === "string"
      ? rawNameId
      : rawNameId && typeof rawNameId.value === "string"
        ? rawNameId.value
        : null;

  return {
    issuer: raw.issuer ?? "",
    audience: raw.audience ?? "",
    nameId,
    response: {
      destination: raw.response?.destination ?? "",
      inResponseTo: raw.response?.inResponseTo ?? null,
    },
    conditions: {
      notBefore: raw.conditions?.notBefore ?? null,
      notOnOrAfter: raw.conditions?.notOnOrAfter ?? null,
    },
    attributes: raw.attributes ?? {},
  };
}

function assertSamlTiming(conditions: SamlResponseExtract["conditions"]) {
  const now = Date.now();
  const skewMs = CLOCK_SKEW_SECONDS * 1000;
  if (conditions.notBefore) {
    const notBefore = new Date(conditions.notBefore).getTime();
    if (Number.isFinite(notBefore) && now + skewMs < notBefore) {
      throw boom(401, "SAML response is not yet valid.");
    }
  }
  if (conditions.notOnOrAfter) {
    const notOnOrAfter = new Date(conditions.notOnOrAfter).getTime();
    if (Number.isFinite(notOnOrAfter) && now - skewMs >= notOnOrAfter) {
      throw boom(401, "SAML response has expired.");
    }
  }
}

function assertContainsSignature(samlContent: string) {
  const hasSignatureTag = /<(?:\w+:)?Signature\b/.test(samlContent);
  if (!hasSignatureTag) {
    throw boom(401, "SAML response is not signed.");
  }
}

function assertSamlAudienceAndRecipient(args: {
  extract: SamlResponseExtract;
  teamSlug: string;
  idpEntityId: string;
}) {
  const urls = getTeamSamlUrls(args.teamSlug);
  if (args.extract.issuer !== args.idpEntityId) {
    throw boom(401, "Invalid SAML issuer.");
  }
  if (args.extract.audience !== urls.entityId) {
    throw boom(401, "Invalid SAML audience.");
  }
  if (args.extract.response.destination !== urls.acsUrl) {
    throw boom(401, "Invalid SAML destination.");
  }
}

function assertSamlRecipientInXml(args: {
  samlContent: string;
  acsUrl: string;
}) {
  const recipientMatch = args.samlContent.match(/Recipient="([^"]+)"/);
  const recipient = recipientMatch?.[1] ?? null;
  if (!recipient || recipient !== args.acsUrl) {
    throw boom(401, "Invalid SAML recipient.");
  }
}

export function extractEmailFromSaml(attributes: SamlAttributes) {
  for (const key of DEFAULT_EMAIL_ATTRIBUTE_KEYS) {
    const value = getString(attributes[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

export async function createSamlLoginRedirect(args: {
  teamSlug: string;
  samlConfig: TeamSamlConfig;
  redirect: string;
}) {
  const nonce = generateRandomHexString(32);
  const sp = createServiceProvider({
    teamSlug: args.teamSlug,
    relayState: nonce,
    requestSigned: false,
  });
  const idp = createIdentityProvider(args.samlConfig);
  const bindingContext = sp.createLoginRequest(idp, "redirect");
  await saveLoginState({
    nonce,
    requestId: bindingContext.id,
    teamSlug: args.teamSlug,
    redirect: args.redirect,
  });
  return bindingContext.context;
}

export function getTeamSamlPublicValues(teamSlug: string) {
  return getTeamSamlUrls(teamSlug);
}

export function getSamlSpMetadata(teamSlug: string) {
  const sp = createServiceProvider({
    teamSlug,
    relayState: "",
    requestSigned: false,
  });
  return sp.getMetadata();
}

export async function parseAndValidateSamlLoginResponse(args: {
  teamSlug: string;
  samlConfig: TeamSamlConfig;
  samlResponse: string;
  relayState: string;
}) {
  const loginState = await consumeSamlLoginState(args.relayState);
  if (!loginState || loginState.teamSlug !== args.teamSlug) {
    throw boom(401, "Invalid or expired SAML RelayState.");
  }
  const sp = createServiceProvider({
    teamSlug: args.teamSlug,
    relayState: args.relayState,
    requestSigned: false,
  });
  const idp = createIdentityProvider(args.samlConfig);
  const result = await sp.parseLoginResponse(idp, "post", {
    body: {
      SAMLResponse: args.samlResponse,
      RelayState: args.relayState,
    },
  });

  const extract = readExtract({ extract: result.extract });
  assertContainsSignature(result.samlContent);
  assertSamlTiming(extract.conditions);
  assertSamlAudienceAndRecipient({
    extract,
    teamSlug: args.teamSlug,
    idpEntityId: args.samlConfig.idpEntityId ?? "",
  });
  assertSamlRecipientInXml({
    samlContent: result.samlContent,
    acsUrl: getTeamSamlUrls(args.teamSlug).acsUrl,
  });
  if (
    extract.response.inResponseTo &&
    extract.response.inResponseTo !== loginState.requestId
  ) {
    throw boom(401, "Invalid SAML InResponseTo.");
  }

  return {
    attributes: extract.attributes,
    subject: extract.nameId,
    loginState,
  };
}

export async function checkHasAccessToSAML(account: Account) {
  const plan = await account.$getSubscriptionManager().getPlan();
  return plan?.samlIncluded ?? false;
}

function getStringLocation(location: string | object) {
  if (typeof location === "string") {
    return location;
  }
  const locationValue = (location as { Location?: string }).Location;
  return locationValue ?? null;
}

export function parseIdpMetadataXml(xml: string) {
  const idp = samlify.IdentityProvider({ metadata: xml });
  const redirectSso = getStringLocation(
    idp.entityMeta.getSingleSignOnService("redirect"),
  );
  const postSso = getStringLocation(
    idp.entityMeta.getSingleSignOnService("post"),
  );
  const ssoUrl = redirectSso ?? postSso;
  if (!ssoUrl) {
    throw boom(400, "No SSO URL found in IdP metadata.");
  }
  const signingCertificates = parseCertificates(
    idp.entityMeta.getX509Certificate("signing"),
  );
  const [signingCertificate] = signingCertificates;
  if (!signingCertificate) {
    throw boom(400, "No signing certificates found in IdP metadata.");
  }
  return {
    idpEntityId: idp.entityMeta.getEntityID(),
    ssoUrl,
    signingCertificate,
  };
}

function parseCertificates(certificates: unknown) {
  if (Array.isArray(certificates)) {
    return certificates.filter((x) => typeof x === "string");
  }
  return typeof certificates === "string" ? [certificates] : [];
}

export const samlTestUtils = {
  assertSamlTiming,
  assertSamlAudienceAndRecipient,
  assertSamlRecipientInXml,
};
