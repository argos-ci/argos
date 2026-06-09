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
  // Mirror the config default in apps/backend/src/config/index.ts so dev/test
  // runs without ENCRYPTION_KEY derive the same key as the application.
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
 * Decrypt a value, or return null if it is not valid ciphertext (legacy
 * plaintext). Used to skip already-encrypted rows so the migration is
 * idempotent.
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
 * Tables, columns and encryption mode to migrate.
 * @type {Array<{ table: string, idColumn: string, columns: string[], deterministic?: boolean }>}
 */
const TARGETS = [
  { table: "github_accounts", idColumn: "id", columns: ["accessToken"] },
  {
    table: "gitlab_users",
    idColumn: "id",
    columns: ["accessToken", "refreshToken"],
  },
  {
    table: "team_saml_configs",
    idColumn: "id",
    columns: ["signingCertificate"],
  },
  {
    table: "projects",
    idColumn: "id",
    columns: ["token"],
    deterministic: true,
  },
];

// Number of rows updated per SQL statement. Each row needs its own value (random
// IV), so this bounds the number of round-trips rather than allowing a set-based
// update. ~17K rows / 1000 = ~17 statements instead of 17K.
const BATCH_SIZE = 1000;

/**
 * Apply per-row new values to a column in a single statement per batch, using
 * `UPDATE ... FROM (VALUES ...)`.
 *
 * @param { import("knex").Knex } knex
 * @param {string} table
 * @param {string} idColumn
 * @param {string} column
 * @param {Array<{ id: unknown, value: string }>} updates
 */
async function bulkUpdateColumn(knex, table, idColumn, column, updates) {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const valuesSql = chunk.map(() => "(?, ?)").join(", ");
    const bindings = [table, column];
    for (const { id, value } of chunk) {
      bindings.push(id, value);
    }
    bindings.push(idColumn);
    await knex.raw(
      `UPDATE ?? AS t SET ?? = v.val FROM (VALUES ${valuesSql}) AS v(id, val) WHERE t.?? = v.id::bigint`,
      bindings,
    );
  }
}

/**
 * @param { import("knex").Knex } knex
 */
async function transform(knex, mode) {
  const key = getKey();
  for (const target of TARGETS) {
    const rows = await knex(target.table).select([
      target.idColumn,
      ...target.columns,
    ]);

    /** @type {Map<string, Array<{ id: unknown, value: string }>>} */
    const updatesByColumn = new Map(target.columns.map((c) => [c, []]));

    for (const row of rows) {
      for (const column of target.columns) {
        const value = row[column];
        if (typeof value !== "string") {
          continue;
        }
        let next;
        if (mode === "encrypt") {
          // Skip values that are already encrypted (idempotency).
          if (tryDecrypt(key, value) !== null) {
            continue;
          }
          next = target.deterministic
            ? encryptDeterministic(key, value)
            : encrypt(key, value);
        } else {
          const decrypted = tryDecrypt(key, value);
          if (decrypted === null) {
            continue;
          }
          next = decrypted;
        }
        updatesByColumn
          .get(column)
          .push({ id: row[target.idColumn], value: next });
      }
    }

    for (const column of target.columns) {
      const updates = updatesByColumn.get(column);
      if (updates.length > 0) {
        await bulkUpdateColumn(
          knex,
          target.table,
          target.idColumn,
          column,
          updates,
        );
      }
    }
  }
}

/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  // Widen columns that may not fit the encrypted blob for long tokens.
  await knex.schema.alterTable("gitlab_users", (table) => {
    table.text("accessToken").notNullable().alter();
    table.text("refreshToken").notNullable().alter();
  });
  await knex.schema.alterTable("github_accounts", (table) => {
    table.text("accessToken").alter();
  });

  await transform(knex, "encrypt");
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await transform(knex, "decrypt");

  await knex.schema.alterTable("gitlab_users", (table) => {
    table.string("accessToken").notNullable().alter();
    table.string("refreshToken").notNullable().alter();
  });
  await knex.schema.alterTable("github_accounts", (table) => {
    table.string("accessToken").alter();
  });
}
