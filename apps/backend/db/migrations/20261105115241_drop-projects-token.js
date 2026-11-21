import { Buffer } from "node:buffer";
import { createDecipheriv, createHash } from "node:crypto";
import process from "node:process";

// `20261105093315_project-tokens` copied every `projects.token`, but the code
// still serving while it ran kept writing there. Copy what it wrote once more,
// as the fallback that moved such a token on first use did, then drop the
// column. A revoked token had its column cleared, so it does not come back.

/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await copyLegacyTokens(knex);
  await knex.schema.alterTable("projects", (table) => {
    table.dropIndex("token", "projects_token_index");
    table.dropColumn("token");
  });
}

/**
 * The tokens are only stored hashed now: the column comes back empty.
 *
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.text("token");
    table.index("token", "projects_token_index");
  });
}

// Inlined copy of `20261105093315_project-tokens`: migrations run as plain ESM
// via the knex CLI and cannot import the application TypeScript.
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

const LEGACY_TOKEN_NAME = "Legacy token";

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

    const projectByHash = new Map();
    for (const project of projects) {
      const hash = hashToken(decrypt(key, project.token));
      // Two projects never share a token, but the unique index would reject
      // the whole batch if they did.
      if (!projectByHash.has(hash)) {
        projectByHash.set(hash, project);
      }
    }

    const copied = new Set(
      await knex("project_tokens")
        .whereIn("token", [...projectByHash.keys()])
        .pluck("token"),
    );
    const missing = [...projectByHash].filter(([hash]) => !copied.has(hash));
    if (missing.length === 0) {
      continue;
    }

    // A token regenerated while the first migration ran replaces the one it
    // copied, which would otherwise stay valid.
    await knex("project_tokens")
      .where("name", LEGACY_TOKEN_NAME)
      .whereNull("createdById")
      .whereExists(
        knex("project_token_projects")
          .whereColumn(
            "project_token_projects.projectTokenId",
            "project_tokens.id",
          )
          .whereIn(
            "project_token_projects.projectId",
            missing.map(([, project]) => project.id),
          ),
      )
      .delete();

    const now = new Date();
    const inserted = await knex("project_tokens")
      .insert(
        missing.map(([hash, project]) => ({
          createdAt: project.createdAt,
          updatedAt: now,
          accountId: project.accountId,
          name: LEGACY_TOKEN_NAME,
          token: hash,
          permissions: JSON.stringify(LEGACY_PERMISSIONS),
        })),
      )
      .onConflict("token")
      .ignore()
      .returning(["id", "token"]);

    if (inserted.length > 0) {
      await knex("project_token_projects").insert(
        inserted.map((row) => ({
          createdAt: now,
          updatedAt: now,
          projectTokenId: row.id,
          projectId: projectByHash.get(row.token).id,
        })),
      );
    }
  }
}
