import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import process from "node:process";

// Inlined copy of apps/backend/src/database/services/encrypt.ts — migrations run
// as plain ESM via the knex CLI and cannot import the application TypeScript.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const IV_DERIVATION_INFO = "argos-iv-derivation";

function getKey() {
  // Encrypting production rows with the publicly-known zero key would be a
  // silent footgun. Locally and in CI, mirror the config default so runs
  // without ENCRYPTION_KEY derive the same key as the application.
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

function encryptWithIv(key, plaintext, iv) {
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function encrypt(key, plaintext) {
  return encryptWithIv(key, plaintext, randomBytes(IV_LENGTH));
}

function encryptDeterministic(key, plaintext) {
  const ivKey = createHmac("sha256", key).update(IV_DERIVATION_INFO).digest();
  const iv = createHmac("sha256", ivKey)
    .update(plaintext)
    .digest()
    .subarray(0, IV_LENGTH);
  return encryptWithIv(key, plaintext, iv);
}

/**
 * Whether a value is ciphertext under the key, to skip rows the application
 * already encrypted and keep the migration idempotent.
 */
function isEncrypted(key, value) {
  const buffer = Buffer.from(value, "base64");
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return false;
  }
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    decipher.update(ciphertext);
    decipher.final();
    return true;
  } catch {
    return false;
  }
}

/**
 * Columns written encrypted since 20261104100038_prepare-secret-encryption,
 * plus two encrypted since after 20260609120000_encrypt-sensitive-data ran,
 * whose rows not rewritten since then are still plaintext.
 */
const TARGETS = [
  { table: "accounts", column: "gitlabAccessToken" },
  { table: "slack_installations", column: "installation" },
  { table: "discord_webhooks", column: "url" },
  { table: "ms_teams_webhooks", column: "url" },
  { table: "teams", column: "inviteSecret", deterministic: true },
  { table: "team_invites", column: "secret", deterministic: true },
  { table: "github_installations", column: "githubToken" },
  { table: "origin_installations", column: "token" },
];

const BATCH_SIZE = 1000;

/**
 * Rewrite a column value by value, one `UPDATE ... FROM (VALUES ...)` statement
 * per batch. Rows are matched on the value itself because `team_invites` has
 * no `id`; rows sharing a plaintext therefore share one random-IV ciphertext.
 *
 * @param { import("knex").Knex } knex
 * @param {string} table
 * @param {string} column
 * @param {Array<{ prev: string, next: string }>} updates
 */
async function bulkUpdateColumn(knex, table, column, updates) {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const valuesSql = chunk.map(() => "(?, ?)").join(", ");
    const bindings = [table, column];
    for (const { prev, next } of chunk) {
      bindings.push(prev, next);
    }
    bindings.push(column);
    await knex.raw(
      `UPDATE ?? AS t SET ?? = v.next FROM (VALUES ${valuesSql}) AS v(prev, next) WHERE t.?? = v.prev`,
      bindings,
    );
  }
}

/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  const key = getKey();
  for (const { table, column, deterministic } of TARGETS) {
    const values = await knex(table).distinct(column).whereNotNull(column);
    const updates = [];
    for (const { [column]: value } of values) {
      if (isEncrypted(key, value)) {
        continue;
      }
      updates.push({
        prev: value,
        next: deterministic
          ? encryptDeterministic(key, value)
          : encrypt(key, value),
      });
    }
    await bulkUpdateColumn(knex, table, column, updates);
  }
}

/**
 * The code of 20261104100038_prepare-secret-encryption reads both forms, so
 * the rows can stay encrypted; rolling that one back decrypts them.
 */
export async function down() {}
