import type { ErrorCode } from "@argos/error-types";
import {
  GraphQLError,
  Kind,
  type ASTNode,
  type OperationDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from "graphql";

/**
 * The standard introspection query is exactly 15 levels deep: lowering
 * `maxDepth` breaks introspection from GraphiQL and other tools wherever it is
 * enabled.
 */
const LIMITS = {
  maxTokens: 5000,
  maxAliases: 30,
  maxDepth: 15,
  maxFields: 5000,
};

export const operationParseOptions = { maxTokens: LIMITS.maxTokens };

/** What a selection set runs once its fragment spreads are expanded. */
type Summary = {
  fields: number;
  aliases: number;
  depth: number;
  /** Fields at the first level, `__typename` aside. */
  topLevelFields: number;
};

const EMPTY: Summary = { fields: 0, aliases: 0, depth: 0, topLevelFields: 0 };

/**
 * Summarizes each fragment once, however many times it is spread, so a
 * document whose fragments expand exponentially costs no more than its own
 * size to measure.
 */
function createSummarizer(context: ValidationContext) {
  const fragments = new Map<string, Summary>();

  const summarizeFragment = (name: string): Summary => {
    const cached = fragments.get(name);
    if (cached) {
      return cached;
    }
    const fragment = context.getFragment(name);
    if (!fragment) {
      return EMPTY;
    }
    // A spread back into a fragment being summarized counts as empty: graphql's
    // own rules report the cycle.
    fragments.set(name, EMPTY);
    const summary = summarize(fragment.selectionSet);
    fragments.set(name, summary);
    return summary;
  };

  const summarize = (selectionSet: SelectionSetNode): Summary => {
    const total = { ...EMPTY };
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        const child = selection.selectionSet
          ? summarize(selection.selectionSet)
          : EMPTY;
        total.fields += 1 + child.fields;
        total.aliases += (selection.alias ? 1 : 0) + child.aliases;
        total.depth = Math.max(total.depth, 1 + child.depth);
        if (selection.name.value !== "__typename") {
          total.topLevelFields += 1;
        }
      } else {
        const child =
          selection.kind === Kind.INLINE_FRAGMENT
            ? summarize(selection.selectionSet)
            : summarizeFragment(selection.name.value);
        total.fields += child.fields;
        total.aliases += child.aliases;
        total.depth = Math.max(total.depth, child.depth);
        total.topLevelFields += child.topLevelFields;
      }
    }
    return total;
  };

  return summarize;
}

function findViolation(
  operation: OperationDefinitionNode["operation"],
  summary: Summary,
): string | null {
  if (operation === "mutation" && summary.topLevelFields > 1) {
    return "This operation has more than one mutation. Send each mutation in its own request.";
  }
  if (summary.aliases > LIMITS.maxAliases) {
    return `This operation has more than ${LIMITS.maxAliases} aliases. Split it into smaller operations.`;
  }
  if (summary.depth > LIMITS.maxDepth) {
    return `This operation is nested more than ${LIMITS.maxDepth} levels deep. Request fewer nested fields.`;
  }
  if (summary.fields > LIMITS.maxFields) {
    return `This operation selects more than ${LIMITS.maxFields.toLocaleString("en-US")} fields, counting each use of a fragment. Split it into smaller operations.`;
  }
  return null;
}

/**
 * Apollo replaces `extensions.code` on validation errors, so the code goes in
 * `argosErrorCode`, which it keeps.
 */
function operationLimitError(message: string, node: ASTNode) {
  return new GraphQLError(message, {
    nodes: [node],
    extensions: {
      argosErrorCode: "OPERATION_LIMIT_EXCEEDED" satisfies ErrorCode,
    },
  });
}

export const OperationLimitsRule: ValidationRule = (context) => {
  const summarize = createSummarizer(context);
  return {
    OperationDefinition(node) {
      const message = findViolation(
        node.operation,
        summarize(node.selectionSet),
      );
      if (message) {
        context.reportError(operationLimitError(message, node));
      }
      return false;
    },
  };
};

/**
 * Messages on an open WebSocket skip the HTTP rate limit, so queries and
 * mutations must go over HTTP.
 */
export const SubscriptionsOnlyRule: ValidationRule = (context) => ({
  OperationDefinition(node) {
    if (node.operation !== "subscription") {
      context.reportError(
        operationLimitError(
          "Only subscriptions run over WebSocket. Send queries and mutations over HTTP.",
          node,
        ),
      );
    }
    return false;
  },
});
