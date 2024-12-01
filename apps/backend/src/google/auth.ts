import { invariant } from "@argos/util/invariant";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

export function getGoogleAuthUrl(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state: string;
}) {
  const { state, clientId, clientSecret, redirectUri } = input;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  return client.generateAuthUrl({
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    state,
  });
}

export async function getGoogleAuthenticatedClient(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}) {
  const { clientId, clientSecret, redirectUri, code } = input;
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  const result = await client.getToken(code);
  client.setCredentials(result.tokens);
  return client;
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
  client: OAuth2Client;
}): Promise<GoogleUserProfile> {
  const { client } = input;
  const response = await client.request({
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
