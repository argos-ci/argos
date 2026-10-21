import { ScimError } from "./error";

const CORE_USER_SCHEMA_PREFIX = "urn:ietf:params:scim:schemas:core:2.0:user:";

/**
 * Attribute paths may be qualified with the core User schema URN
 * (`urn:ietf:params:scim:schemas:core:2.0:User:userName`), case-insensitively.
 */
export function stripCoreUserSchema(path: string) {
  return path.toLowerCase().startsWith(CORE_USER_SCHEMA_PREFIX)
    ? path.slice(CORE_USER_SCHEMA_PREFIX.length)
    : path;
}

export type ScimUserFilter = {
  attribute: "id" | "userName" | "externalId" | "email";
  value: string;
};

const FILTERABLE_ATTRIBUTES: Record<string, ScimUserFilter["attribute"]> = {
  id: "id",
  username: "userName",
  externalid: "externalId",
  emails: "email",
  "emails.value": "email",
};

const EQ_FILTER_REGEX = /^\s*(\S+)\s+eq\s+"((?:[^"\\]|\\.)*)"\s*$/i;

/**
 * Parse a SCIM filter (RFC 7644 §3.4.2.2). Only the single `eq` comparison
 * Identity Providers use to look a user up before provisioning it is
 * supported: `userName eq "jane@acme.com"`.
 */
export function parseUserFilter(filter: string): ScimUserFilter {
  const match = EQ_FILTER_REGEX.exec(filter);
  if (!match) {
    throw new ScimError(
      400,
      `Unsupported filter "${filter}". Only a single "eq" comparison is supported.`,
      "invalidFilter",
    );
  }
  const [, rawAttribute = "", rawValue = ""] = match;
  const attribute =
    FILTERABLE_ATTRIBUTES[stripCoreUserSchema(rawAttribute).toLowerCase()];
  if (!attribute) {
    throw new ScimError(
      400,
      `Filtering on "${rawAttribute}" is not supported.`,
      "invalidFilter",
    );
  }
  try {
    // The value is a JSON string literal, escapes included.
    const value: string = JSON.parse(`"${rawValue}"`);
    return { attribute, value };
  } catch {
    throw new ScimError(
      400,
      `Invalid value in filter "${filter}".`,
      "invalidFilter",
    );
  }
}
