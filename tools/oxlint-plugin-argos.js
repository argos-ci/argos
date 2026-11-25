/**
 * Local Oxlint plugin for rules that have no built-in equivalent.
 *
 * Referenced from `.oxlintrc.json` via `jsPlugins`.
 */

import { readFileSync } from "node:fs";

const MODULE_RELATIVE_PATH_MESSAGE =
  "Do not derive paths from a module's own location — it does not survive bundling. Use resolveFromPackageRoot or resolveFromRepositoryRoot from @/util/paths.";

const MODULE_LOCATION_PROPERTIES = new Set(["dirname", "filename", "url"]);

/**
 * The backend is bundled, so a module does not keep its own file in the output:
 * `src/config/index.ts` may land at `dist/config/index.js` or be inlined into
 * `dist/chunks/config-a1b2c3.js`. Counting `../` from the running file then
 * resolves somewhere else entirely, and it fails at runtime rather than at
 * build time — which is exactly how the frontend `dist` lookup in
 * `web/app-router.ts` slipped through review.
 */
const noModuleRelativePaths = {
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === "MetaProperty" &&
          node.property.type === "Identifier" &&
          MODULE_LOCATION_PROPERTIES.has(node.property.name)
        ) {
          context.report({ node, message: MODULE_RELATIVE_PATH_MESSAGE });
        }
      },
      Identifier(node) {
        if (node.name === "__dirname" || node.name === "__filename") {
          context.report({ node, message: MODULE_RELATIVE_PATH_MESSAGE });
        }
      },
    };
  },
};

const DASH_IN_COPY_MESSAGE =
  'Copy has no em or en dashes. Use a period, a colon, a comma or parentheses, and a hyphen or "to" for a range.';

const DASH_PATTERN = /[\u2013\u2014]/;

/**
 * Enforces the dash ban from the Copy section of AGENTS.md. It reads every
 * string the code can show, not only JSX text: toasts, emails, API and MCP
 * descriptions and error messages are all string literals.
 */
const noDashesInCopy = {
  create(context) {
    function check(node, text) {
      if (DASH_PATTERN.test(text)) {
        context.report({ node, message: DASH_IN_COPY_MESSAGE });
      }
    }
    return {
      JSXText(node) {
        check(node, node.value);
      },
      Literal(node) {
        if (typeof node.value === "string") {
          check(node, node.value);
        }
      },
      TemplateElement(node) {
        check(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
};

const TO_ONE_RELATIONS = new Set([
  "BelongsToOneRelation",
  "HasOneRelation",
  "HasOneThroughRelation",
]);

let schema;

/**
 * The columns of `structure.sql`: which are nullable, and which carry a
 * foreign key constraint.
 */
function getSchema() {
  if (!schema) {
    const sql = readFileSync(
      new URL("../apps/backend/db/structure.sql", import.meta.url),
      "utf8",
    );
    const nullable = new Map();
    for (const [, table, body] of sql.matchAll(
      /CREATE TABLE public\.(\w+) \(\n([\s\S]*?)\n\)/g,
    )) {
      for (const line of body.split("\n").map((line) => line.trim())) {
        const column = line.match(/^"?(\w+)"? /);
        if (column && !line.startsWith("CONSTRAINT ")) {
          nullable.set(`${table}.${column[1]}`, !line.includes(" NOT NULL"));
        }
      }
    }
    const foreignKeys = new Set();
    for (const [, table, columns] of sql.matchAll(
      /ALTER TABLE ONLY public\.(\w+)\s+ADD CONSTRAINT \S+ FOREIGN KEY \(([^)]+)\)/g,
    )) {
      for (const column of columns.split(",")) {
        foreignKeys.add(`${table}.${column.trim().replaceAll('"', "")}`);
      }
    }
    schema = { nullable, foreignKeys };
  }
  return schema;
}

function getProperty(objectExpression, name) {
  return objectExpression.properties.find(
    (property) =>
      property.type === "Property" &&
      property.key.type === "Identifier" &&
      property.key.name === name,
  );
}

/**
 * Why a to-one relation can be null once fetched, or null if it can't.
 */
function getNullReason(mapping) {
  const relation = getProperty(mapping, "relation")?.value;
  const join = getProperty(mapping, "join")?.value;
  if (
    relation?.type !== "MemberExpression" ||
    !TO_ONE_RELATIONS.has(relation.property.name) ||
    join?.type !== "ObjectExpression"
  ) {
    return undefined;
  }
  if (getProperty(mapping, "modify") || getProperty(mapping, "filter")) {
    return "its mapping filters the related row";
  }
  if (getProperty(join, "through")) {
    return "it goes through a join table";
  }
  const from = getProperty(join, "from")?.value;
  if (from?.type !== "Literal" || typeof from.value !== "string") {
    return undefined;
  }
  const column = from.value;
  if (column.endsWith(".id")) {
    return "its foreign key lives on the related table";
  }
  const { nullable, foreignKeys } = getSchema();
  if (!nullable.has(column)) {
    return `\`${column}\` is not in structure.sql`;
  }
  if (nullable.get(column)) {
    return `\`${column}\` is nullable`;
  }
  if (!foreignKeys.has(column)) {
    return `\`${column}\` has no foreign key constraint`;
  }
  return null;
}

/**
 * Objection sets a fetched to-one relation to `null` when there is no row, and
 * code relies on the declared type to know when that can happen: `invariant`
 * rejects a check on a value its type says is never null. So a relation field
 * is `| null` exactly when the schema allows a missing row.
 */
const relationMatchesSchema = {
  create(context) {
    return {
      ClassDeclaration(node) {
        const members = node.body.body;
        const declaration = members.find(
          (member) =>
            member.static &&
            member.key.type === "Identifier" &&
            member.key.name === "relationMappings",
        );
        // A static property or a static getter that returns the mappings.
        const mappings =
          declaration?.type === "MethodDefinition"
            ? declaration.value.body?.body.find(
                (statement) => statement.type === "ReturnStatement",
              )?.argument
            : declaration?.value;
        if (mappings?.type !== "ObjectExpression") {
          return;
        }
        for (const property of mappings.properties) {
          if (
            property.type !== "Property" ||
            property.key.type !== "Identifier" ||
            property.value.type !== "ObjectExpression"
          ) {
            continue;
          }
          const name = property.key.name;
          const nullReason = getNullReason(property.value);
          const field = members.find(
            (member) =>
              member.type === "PropertyDefinition" &&
              !member.static &&
              member.key.type === "Identifier" &&
              member.key.name === name,
          );
          const type = field?.typeAnnotation?.typeAnnotation;
          if (nullReason === undefined || !type) {
            continue;
          }
          const typedNullable =
            type.type === "TSUnionType" &&
            type.types.some((member) => member.type === "TSNullKeyword");
          const label = `${node.id?.name}.${name}`;
          if (nullReason && !typedNullable) {
            context.report({
              node: field,
              message: `\`${label}\` can be null once fetched: ${nullReason}. Add \`| null\` to its type.`,
            });
          } else if (!nullReason && typedNullable) {
            context.report({
              node: field,
              message: `\`${label}\` is never null once fetched: its foreign key is NOT NULL and constrained. Remove \`| null\` from its type.`,
            });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "argos" },
  rules: {
    "no-dashes-in-copy": noDashesInCopy,
    "no-module-relative-paths": noModuleRelativePaths,
    "relation-matches-schema": relationMatchesSchema,
  },
};
