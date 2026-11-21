import type { Knex } from "knex";

import type { AuthViewer } from "@/auth/payload";

import { knex } from "../knex";
import type { User } from "../models";

const KNEX_TABLES = ["knex_migrations", "knex_migrations_lock"];

let truncateQuery: string;
async function getTruncateQuery(knex: Knex) {
  if (!truncateQuery) {
    const result = await knex.raw<{ rows: { tablename: string }[] }>(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
    );

    const tables = result.rows.reduce(
      (tablesAcc, { tablename }) =>
        KNEX_TABLES.includes(tablename) ? tablesAcc : [...tablesAcc, tablename],
      [] as string[],
    );

    const disableTriggers = tables.map(
      (table) => `ALTER TABLE ${table} DISABLE TRIGGER ALL`,
    );
    const deletes = tables.map((table) => `DELETE FROM ${table}`);
    const enableTriggers = tables.map(
      (table) => `ALTER TABLE ${table} ENABLE TRIGGER ALL`,
    );
    truncateQuery = [...disableTriggers, ...deletes, ...enableTriggers].join(
      ";",
    );
  }

  return truncateQuery;
}

export async function truncateAll(knex: Knex) {
  const query = await getTruncateQuery(knex);
  return knex.raw(query);
}

export const setupDatabase = async () => {
  await truncateAll(knex);
};

/** A request by `user` on a session that went through no SAML IdP. */
export function sessionViewer(user: User): AuthViewer {
  return { type: "session", user, samlTeamId: null };
}
