/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Update automation_action_runs to set "channelId" to the Slack ID
  await knex.raw(
    `
      WITH candidate AS (
      SELECT
        aar.id,
        jsonb_set(
          aar."actionPayload",
          '{channelId}',
          to_jsonb(sc."slackId"),
          true
        ) AS new_payload
      FROM automation_action_runs AS aar
      JOIN slack_channels AS sc
        ON (aar."actionPayload" ->> 'channelId') ~ '^\\d+$'
      AND (aar."actionPayload" ->> 'channelId')::int = sc.id
      WHERE jsonb_exists(aar."actionPayload", 'channelId')
    )
    UPDATE automation_action_runs AS aar
    SET "actionPayload" = c.new_payload
    FROM candidate AS c
    WHERE c.id = aar.id
      AND aar."actionPayload" IS DISTINCT FROM c.new_payload
    RETURNING aar.id;
    `,
  );

  // Update automation_rules to set "channelId" to the Slack ID
  await knex.raw(
    `
      WITH expanded AS (
      SELECT
        ar.id,
        t.i,
        CASE
          WHEN t.elem->>'action' = 'sendSlackMessage'
          AND (t.elem->'actionPayload'->>'channelId') ~ '^\\d+$'
          AND sc.id = (t.elem->'actionPayload'->>'channelId')::int
          THEN jsonb_set(
                t.elem,
                '{actionPayload}',
                jsonb_set(
                  (t.elem->'actionPayload') - 'channelId',
                  '{channelId}',
                  to_jsonb(sc."slackId"),
                  true
                ),
                true
              )
          ELSE t.elem
        END AS new_elem
      FROM automation_rules AS ar
      CROSS JOIN LATERAL jsonb_array_elements(ar."then") WITH ORDINALITY AS t(elem, i)
      LEFT JOIN slack_channels AS sc
        ON (t.elem->'actionPayload'->>'channelId') ~ '^\\d+$'
      AND sc.id = (t.elem->'actionPayload'->>'channelId')::int
    ),
    reassembled AS (
      SELECT id, jsonb_agg(new_elem ORDER BY i) AS new_then
      FROM expanded
      GROUP BY id
    )
    UPDATE automation_rules AS ar
    SET "then" = r.new_then
    FROM reassembled AS r
    WHERE r.id = ar.id
      AND ar."then" IS DISTINCT FROM r.new_then
    RETURNING ar.id;
    `,
  );
};

export const down = async () => {};
