import { invariant } from "@argos/util/invariant";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import config from "@/config";

function createOAuth2Client() {
  return new OAuth2Client(
    config.get("google.clientId"),
    config.get("google.clientSecret"),
    `${config.get("server.url")}/auth/google/callback`,
  );
}

export function getGoogleAuthUrl(input: { r: string }) {
  const oAuth2Client = createOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state: input.r,
  });
}

export async function getGoogleAuthenticatedClient(input: { code: string }) {
  const oAuth2Client = createOAuth2Client();
  const result = await oAuth2Client.getToken(input.code);
  oAuth2Client.setCredentials(result.tokens);
  return oAuth2Client;
}

const RawGoogleProfileSchema = z.object({
  resourceName: z.string(),
  names: z.array(
    z.object({
      displayName: z.string(),
      metadata: z.object({
        primary: z.boolean().optional(),
      }),
    }),
  ),
  emailAddresses: z.array(
    z.object({
      value: z.string(),
      metadata: z.object({
        primary: z.boolean().optional(),
      }),
    }),
  ),
});

function getIdFromResourceName(resourceName: string) {
  const match = resourceName.match(/people\/(.+)$/);
  invariant(match && match[1], "Invalid resource name");
  return match[1];
}

export type GoogleUserProfile = {
  id: string;
  name: string | null;
  primaryEmail: string;
  emails: string[];
};

const EmailSchema = z.string().email();

function checkIsValidEmail(email: string) {
  return EmailSchema.safeParse(email).success;
}

export async function getGoogleUserProfile(input: {
  oAuth2Client: OAuth2Client;
}): Promise<GoogleUserProfile> {
  const response = await input.oAuth2Client.request({
    url: "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses",
  });
  const profile = RawGoogleProfileSchema.parse(response.data);
  const emails = profile.emailAddresses.reduce<string[]>((emails, entry) => {
    const value = entry.value.trim().toLowerCase();
    if (checkIsValidEmail(value)) {
      emails.push(value);
    }
    return emails;
  }, []);
  invariant(emails[0], "Expected one email");
  return {
    id: getIdFromResourceName(profile.resourceName),
    name: profile.names.find((n) => n.metadata.primary)?.displayName ?? null,
    primaryEmail: emails[0],
    emails,
  };
}
