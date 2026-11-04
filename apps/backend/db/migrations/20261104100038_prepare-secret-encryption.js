import { Buffer } from "node:buffer";
import { createDecipheriv } from "node:crypto";
import process from "node:process";

// Widens the columns that will hold ciphertext. The previous code reads and
// writes these types unchanged (a `text` column of JSON is parsed like
// `jsonb`), so this is safe to run before the code that encrypts them ships.
// Existing rows are encrypted by a later migration, once that code is live.

/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("accounts", (table) => {
    table.text("gitlabAccessToken").alter();
  });
  // The ciphertext of a JSON document is not JSON itself.
  await knex.schema.alterTable("slack_installations", (table) => {
    table.text("installation").notNullable().alter();
  });
  await knex.schema.alterTable("team_invites", (table) => {
    table.text("secret").notNullable().alter();
  });
}

// Inlined copy of the decryption in apps/backend/src/database/services/encrypt.ts
// — migrations run as plain ESM via the knex CLI and cannot import the
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
 * Decrypt a value, or return null if it is not valid ciphertext (plaintext).
 */
function tryDecrypt(key, value) {
  const buffer = Buffer.from(value, "base64");
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    return null;
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
    return null;
  }
}

/**
 * Columns the code shipped with this migration writes encrypted.
 */
const ENCRYPTED_COLUMNS = [
  { table: "accounts", column: "gitlabAccessToken" },
  { table: "slack_installations", column: "installation" },
  { table: "discord_webhooks", column: "url" },
  { table: "ms_teams_webhooks", column: "url" },
  { table: "teams", column: "inviteSecret" },
  { table: "team_invites", column: "secret" },
];

const BATCH_SIZE = 1000;

/**
 * Decrypt a column value by value, one `UPDATE ... FROM (VALUES ...)` statement
 * per batch. Rows are matched on the value itself because `team_invites` has
 * no `id`.
 *
 * @param { import("knex").Knex } knex
 * @param {string} table
 * @param {string} column
 */
async function decryptColumn(knex, table, column) {
  const key = getKey();
  const values = await knex(table).distinct(column).whereNotNull(column);
  const updates = [];
  for (const { [column]: value } of values) {
    const decrypted = tryDecrypt(key, value);
    if (decrypted !== null) {
      updates.push({ prev: value, next: decrypted });
    }
  }
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
export async function down(knex) {
  // The previous code cannot read what this release encrypted.
  for (const { table, column } of ENCRYPTED_COLUMNS) {
    await decryptColumn(knex, table, column);
  }

  await knex.schema.alterTable("accounts", (table) => {
    table.string("gitlabAccessToken").alter();
  });
  await knex.raw(
    `ALTER TABLE slack_installations ALTER COLUMN installation TYPE jsonb USING installation::jsonb`,
  );
  await knex.schema.alterTable("team_invites", (table) => {
    table.string("secret", 20).notNullable().alter();
  });
}
