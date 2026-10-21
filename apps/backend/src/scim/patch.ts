import { z } from "zod";

import { invalidValue, ScimError } from "./error";
import { stripCoreUserSchema } from "./filter";
import {
  parseBoolean,
  parseEmails,
  parseOptionalString,
  parseUserName,
  pickRole,
  toRole,
  type ScimUserAttributes,
} from "./user";

const OperationsSchema = z
  .array(
    z.object({
      // Entra ID capitalizes them: "Replace".
      op: z
        .string()
        .transform((op) => op.toLowerCase())
        .pipe(z.enum(["add", "replace", "remove"])),
      path: z.string().trim().min(1).optional(),
      value: z.unknown().optional(),
    }),
  )
  .min(1);

type PatchOperation = z.infer<typeof OperationsSchema>[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the operations of a PATCH request (RFC 7644 §3.5.2).
 */
export function parsePatchOperations(body: unknown): PatchOperation[] {
  // Attribute names are case-insensitive, those of the request message too.
  const operations = isRecord(body)
    ? Object.entries(body).find(([key]) => key.toLowerCase() === "operations")
    : undefined;
  const result = OperationsSchema.safeParse(operations?.[1]);
  if (!result.success) {
    throw new ScimError(
      400,
      "The request must hold a non-empty list of Operations, each with an op of add, replace or remove.",
      "invalidSyntax",
    );
  }
  return result.data;
}

/**
 * Apply PATCH operations to a user's attributes.
 *
 * Attributes Argos does not keep are accepted and dropped rather than
 * rejected: Identity Providers send whatever their mapping holds (phone
 * numbers, the enterprise extension, …), and refusing it would fail the whole
 * update.
 */
export function applyPatch(
  user: ScimUserAttributes,
  operations: PatchOperation[],
): ScimUserAttributes {
  const next = { ...user };
  for (const { op, path, value } of operations) {
    const remove = op === "remove";
    if (path) {
      applyToPath(next, remove, path, value);
      continue;
    }
    // Without a path, the value maps paths to their new value — Okta
    // deactivates with `{ "op": "replace", "value": { "active": false } }`.
    if (remove) {
      throw new ScimError(400, "A remove operation needs a path.", "noTarget");
    }
    if (!isRecord(value)) {
      throw invalidValue("Without a path, the value must be an object.");
    }
    for (const [key, attributeValue] of Object.entries(value)) {
      applyToPath(next, remove, key, attributeValue);
    }
  }
  return next;
}

/** `attribute[filter].subAttribute`, the filter and sub-attribute optional. */
const PATH_REGEX = /^([a-z][\w-]*)(?:\[.+\])?(?:\.([a-z][\w-]*))?$/i;

function applyToPath(
  user: ScimUserAttributes,
  remove: boolean,
  rawPath: string,
  value: unknown,
) {
  const path = stripCoreUserSchema(rawPath);
  const match = PATH_REGEX.exec(path);
  if (!match) {
    // An attribute of a schema extension, such as the enterprise user's
    // `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department`.
    if (path.toLowerCase().startsWith("urn:")) {
      return;
    }
    throw new ScimError(400, `Invalid path "${rawPath}".`, "invalidPath");
  }
  const [, attribute = "", subAttribute] = match;
  switch (attribute.toLowerCase()) {
    case "active": {
      if (!remove) {
        user.active = parseBoolean(value);
      }
      return;
    }
    case "username": {
      if (remove) {
        throw new ScimError(400, "userName can't be removed.", "mutability");
      }
      user.userName = parseUserName(value);
      return;
    }
    case "externalid": {
      user.externalId = remove ? null : parseOptionalString(value);
      return;
    }
    case "displayname": {
      user.displayName = remove ? null : parseOptionalString(value);
      return;
    }
    case "name": {
      applyToName(user, remove, subAttribute, value);
      return;
    }
    case "emails": {
      // Argos keeps a single email, so every `emails` path targets it,
      // whatever its filter: Entra ID writes `emails[type eq "work"].value`.
      if (subAttribute && subAttribute.toLowerCase() !== "value") {
        return;
      }
      user.email = remove ? null : parseEmailValue(subAttribute, value);
      return;
    }
    case "roles": {
      // Like emails, a single role is kept: Entra ID writes
      // `roles[primary eq "True"].value`.
      if (subAttribute && subAttribute.toLowerCase() !== "value") {
        return;
      }
      user.role = remove ? null : getRoleValue(subAttribute, value);
      return;
    }
  }
}

function applyToName(
  user: ScimUserAttributes,
  remove: boolean,
  subAttribute: string | undefined,
  value: unknown,
) {
  if (subAttribute) {
    switch (subAttribute.toLowerCase()) {
      case "givenname":
        user.givenName = remove ? null : parseOptionalString(value);
        return;
      case "familyname":
        user.familyName = remove ? null : parseOptionalString(value);
        return;
      default:
        return;
    }
  }
  if (remove) {
    user.givenName = null;
    user.familyName = null;
    return;
  }
  if (!isRecord(value)) {
    throw invalidValue("name must be an object.");
  }
  // Sub-attributes left out of the value stay unchanged (RFC 7644 §3.5.2.3).
  for (const [key, subValue] of Object.entries(value)) {
    applyToName(user, remove, key, subValue);
  }
}

function getRoleValue(subAttribute: string | undefined, value: unknown) {
  if (subAttribute) {
    return toRole(value);
  }
  if (isRecord(value)) {
    return toRole(value["value"]);
  }
  return pickRole(value);
}

function parseEmailValue(subAttribute: string | undefined, value: unknown) {
  if (subAttribute) {
    return parseOptionalString(value);
  }
  if (Array.isArray(value)) {
    return parseEmails(value);
  }
  if (isRecord(value)) {
    return parseOptionalString(value["value"]);
  }
  throw invalidValue("emails must be a list of emails.");
}
