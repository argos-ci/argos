import { Buffer } from "node:buffer";
import { createDecipheriv, createHash } from "node:crypto";
import process from "node:process";

// Project tokens move out of `projects.token` into their own table: several
// per project, owned by the account, hashed and shown once.
//
// Every existing token is copied, so CI keeps authenticating with the token it
// already holds. `projects.token` stays (nullable) until the code reading it
// as a fallback is gone: this migration runs before that code ships, and the
// code still serving meanwhile writes there.

/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.createTable("project_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("accountId").notNullable().index();
    table.string("name", 255).notNullable();
    table.string("token", 64).notNullable().unique();
    table.jsonb("permissions").notNullable();
    table.dateTime("expireAt");
    table.dateTime("lastUsedAt");
    table.bigInteger("createdById");
    table.foreign("accountId").references("accounts.id").onDelete("cascade");
    table.foreign("createdById").references("users.id").onDelete("set null");
  });

  await knex.schema.createTable("project_token_projects", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("projectTokenId").notNullable();
    table.bigInteger("projectId").notNullable().index();
    table
      .foreign("projectTokenId")
      .references("project_tokens.id")
      .onDelete("cascade");
    table.foreign("projectId").references("projects.id").onDelete("cascade");
    table.unique(["projectTokenId", "projectId"]);
  });

  await knex.raw(`ALTER TABLE projects ALTER COLUMN token DROP NOT NULL`);

  await copyLegacyTokens(knex);
}

/**
 * Projects created after this migration have no legacy token, so the column
 * cannot be made `NOT NULL` again.
 *
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.dropTable("project_token_projects");
  await knex.schema.dropTable("project_tokens");
}

// Inlined copy of the decryption in apps/backend/src/database/services/encrypt.ts
// and of `hashToken` in apps/backend/src/database/services/crypto.ts —
// migrations run as plain ESM via the knex CLI and cannot import the
// application TypeScript.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  if (process.env.NODE_ENV === "production" && !process.env.ENCRYPTION_KEY) {
    throw new Error(
      "ENCRYPTION_KEY must be set to run this migration in production.",
    );
  }
  const hexKey =
    process.env.ENCRYPTION_KEY ||
    "0000000000000000000000000000000000000000000000000000000000000000";
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32) {
    throw new Error(
      "Invalid ENCRYPTION_KEY: expected a 32-byte (64 hex characters) key.",
    );
  }
  return key;
}

/**
 * Decrypt a value, or return it unchanged when it is not ciphertext (a token
 * written before secrets were encrypted).
 */
function decrypt(key, value) {
  const buffer = Buffer.from(value, "base64");
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return value;
  }
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return value;
  }
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

const LEGACY_PERMISSIONS = [
  "builds:write",
  "deployments:write",
  "projects:read",
  "media:read",
  "media:write",
];

const BATCH_SIZE = 1000;

/**
 * @param { import("knex").Knex } knex
 */
async function copyLegacyTokens(knex) {
  const key = getKey();
  let lastId = "0";
  for (;;) {
    const projects = await knex("projects")
      .select("id", "accountId", "token", "createdAt")
      .whereNotNull("token")
      .whereNull("deletedAt")
      .where("id", ">", lastId)
      .orderBy("id", "asc")
      .limit(BATCH_SIZE);

    const last = projects.at(-1);
    if (!last) {
      return;
    }
    lastId = last.id;

    const now = new Date();
    const projectIdByHash = new Map();
    const rows = [];
    for (const project of projects) {
      const hash = hashToken(decrypt(key, project.token));
      // Two projects never share a token, but the unique index would reject
      // the whole batch if they did.
      if (projectIdByHash.has(hash)) {
        continue;
      }
      projectIdByHash.set(hash, project.id);
      rows.push({
        createdAt: project.createdAt,
        updatedAt: now,
        accountId: project.accountId,
        name: "Legacy token",
        token: hash,
        permissions: JSON.stringify(LEGACY_PERMISSIONS),
      });
    }

    const inserted = await knex("project_tokens")
      .insert(rows)
      .onConflict("token")
      .ignore()
      .returning(["id", "token"]);

    if (inserted.length > 0) {
      await knex("project_token_projects").insert(
        inserted.map((row) => ({
          createdAt: now,
          updatedAt: now,
          projectTokenId: row.id,
          projectId: projectIdByHash.get(row.token),
        })),
      );
    }
  }
}
