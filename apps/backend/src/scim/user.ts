import { TeamUserLevelSchema } from "@argos/schemas/team-user-level";
import { z } from "zod";

import config from "@/config";
import type { TeamScimUser } from "@/database/models";
import type { TeamUserLevel } from "@/database/services/team-member";

import { invalidValue } from "./error";

export const SCIM_SCHEMAS = {
  user: "urn:ietf:params:scim:schemas:core:2.0:User",
  listResponse: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  patchOp: "urn:ietf:params:scim:api:messages:2.0:PatchOp",
  error: "urn:ietf:params:scim:api:messages:2.0:Error",
  serviceProviderConfig:
    "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
  resourceType: "urn:ietf:params:scim:schemas:core:2.0:ResourceType",
  schema: "urn:ietf:params:scim:schemas:core:2.0:Schema",
} as const;

export function getScimBaseUrl() {
  return new URL("/scim/v2", config.get("api.baseUrl")).href;
}

/**
 * The user attributes Argos keeps from a SCIM User resource. Everything else
 * the Identity Provider sends (phone numbers, the enterprise extension, …) is
 * accepted and dropped.
 */
export type ScimUserAttributes = {
  userName: string;
  externalId: string | null;
  email: string | null;
  displayName: string | null;
  givenName: string | null;
  familyName: string | null;
  active: boolean;
  role: TeamUserLevel | null;
};

/**
 * Microsoft Entra ID sends booleans as the strings "True" and "False".
 */
const BooleanishSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") {
      return true;
    }
    if (lower === "false") {
      return false;
    }
  }
  return value;
}, z.boolean());

const OptionalStringSchema = z
  .string()
  .trim()
  .max(255)
  .nullish()
  .transform((value) => value || null);

const UserNameSchema = z.string().trim().min(1).max(255);

const EmailSchema = z.object({
  value: z.string().trim(),
  type: z.string().nullish(),
  primary: BooleanishSchema.nullish(),
});

const EmailsSchema = z.array(EmailSchema);

const UserInputSchema = z.object({
  userName: UserNameSchema,
  externalId: OptionalStringSchema,
  displayName: OptionalStringSchema,
  name: z
    .object({
      givenName: OptionalStringSchema,
      familyName: OptionalStringSchema,
    })
    .nullish(),
  emails: EmailsSchema.nullish(),
  active: BooleanishSchema.optional(),
  roles: z.unknown().optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const [issue] = result.error.issues;
    const path = issue?.path.join(".");
    throw invalidValue(
      path ? `${path}: ${issue?.message}` : (issue?.message ?? "Invalid value"),
    );
  }
  return result.data;
}

export function parseUserName(value: unknown) {
  return parse(UserNameSchema, value);
}

export function parseBoolean(value: unknown) {
  return parse(BooleanishSchema, value);
}

export function parseOptionalString(value: unknown) {
  return parse(OptionalStringSchema, value);
}

/**
 * Pick the email to keep from a multi-valued `emails`: the primary one, else
 * the work one — the one Entra ID maps by default — else the first.
 */
function pickPrimaryEmail(emails: z.infer<typeof EmailsSchema>) {
  const email =
    emails.find((email) => email.primary) ??
    emails.find((email) => email.type?.toLowerCase() === "work") ??
    emails[0];
  return email?.value || null;
}

export function parseEmails(value: unknown): string | null {
  return pickPrimaryEmail(parse(EmailsSchema, value));
}

const RolesSchema = z.array(
  z.union([
    z.string().transform((value) => ({ value, primary: null })),
    z.object({ value: z.string(), primary: BooleanishSchema.nullish() }),
  ]),
);

/**
 * Read a role as a member level, matched case-insensitively.
 *
 * Anything else reads as no role rather than failing the request: it may also
 * carry a deactivation, which has to go through whatever the role says.
 */
export function toRole(value: unknown): TeamUserLevel | null {
  if (typeof value !== "string") {
    return null;
  }
  return TeamUserLevelSchema.safeParse(value.trim().toLowerCase()).data ?? null;
}

/**
 * Pick the role from a multi-valued `roles`: the primary one, else the first.
 * Okta sends a string array, Entra ID its app role assignments as
 * `{ value, primary }`.
 */
export function pickRole(value: unknown): TeamUserLevel | null {
  const roles = RolesSchema.safeParse(value).data ?? [];
  const role = roles.find((role) => role.primary) ?? roles[0];
  return toRole(role?.value);
}

/**
 * Read the attributes of a User resource sent on `POST` or `PUT`.
 *
 * `active` is left to `current` when absent: a `PUT` that omits it must not
 * reactivate a user the Identity Provider deactivated.
 */
export function parseUserInput(
  body: unknown,
  current: ScimUserAttributes | null,
): ScimUserAttributes {
  const input = parse(UserInputSchema, body);
  return {
    userName: input.userName,
    externalId: input.externalId,
    displayName: input.displayName,
    givenName: input.name?.givenName ?? null,
    familyName: input.name?.familyName ?? null,
    email: input.emails ? pickPrimaryEmail(input.emails) : null,
    active: input.active ?? current?.active ?? true,
    role: pickRole(input.roles),
  };
}

export function getUserAttributes(scimUser: TeamScimUser): ScimUserAttributes {
  return {
    userName: scimUser.userName,
    externalId: scimUser.externalId,
    email: scimUser.email,
    displayName: scimUser.displayName,
    givenName: scimUser.givenName,
    familyName: scimUser.familyName,
    active: scimUser.active,
    role: scimUser.role,
  };
}

/**
 * Serialize a provisioned user as a SCIM User resource. Unassigned attributes
 * are omitted rather than sent as `null` (RFC 7643 §2.5).
 */
export function serializeUser(scimUser: TeamScimUser) {
  const formatted = [scimUser.givenName, scimUser.familyName]
    .filter(Boolean)
    .join(" ");
  return {
    schemas: [SCIM_SCHEMAS.user],
    id: scimUser.id,
    externalId: scimUser.externalId ?? undefined,
    userName: scimUser.userName,
    name: formatted
      ? {
          givenName: scimUser.givenName ?? undefined,
          familyName: scimUser.familyName ?? undefined,
          formatted,
        }
      : undefined,
    displayName: scimUser.displayName ?? undefined,
    emails: scimUser.email
      ? [{ value: scimUser.email, type: "work", primary: true }]
      : undefined,
    active: scimUser.active,
    roles: scimUser.role
      ? [{ value: scimUser.role, primary: true }]
      : undefined,
    meta: {
      resourceType: "User",
      created: scimUser.createdAt,
      lastModified: scimUser.updatedAt,
      location: `${getScimBaseUrl()}/Users/${scimUser.id}`,
    },
  };
}
