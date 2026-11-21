/**
 * Local Oxlint plugin for rules that have no built-in equivalent.
 *
 * Referenced from `.oxlintrc.json` via `jsPlugins`.
 */

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

export default {
  meta: { name: "argos" },
  rules: {
    "no-dashes-in-copy": noDashesInCopy,
    "no-module-relative-paths": noModuleRelativePaths,
  },
};
