import {
  GraphQLError,
  Kind,
  type ASTNode,
  type GraphQLFormattedError,
  type OperationDefinitionNode,
  type SelectionSetNode,
  type ValidationContext,
  type ValidationRule,
} from "graphql";

/**
 * Sized from the frontend's own operations, which reach depth 12, 5 aliases,
 * 1,528 fields and 1,379 tokens. The standard introspection query is exactly
 * 15 levels deep: lowering `maxDepth` breaks introspection from GraphiQL and
 * other tools wherever it is enabled.
 */
const LIMITS = {
  maxTokens: 5000,
  maxAliases: 30,
  maxDepth: 15,
  maxFields: 5000,
};

const OPERATION_LIMIT_EXCEEDED = "OPERATION_LIMIT_EXCEEDED";

class OperationLimitError extends GraphQLError {
  constructor(message: string, node: ASTNode) {
    super(message, {
      nodes: [node],
      extensions: { code: OPERATION_LIMIT_EXCEEDED },
    });
  }
}

export const operationParseOptions = { maxTokens: LIMITS.maxTokens };

type Violation = "mutations" | "aliases" | "depth" | "fields";

const messages: Record<Violation, string> = {
  mutations:
    "This operation has more than one mutation. Send each mutation in its own request.",
  aliases: `This operation has more than ${LIMITS.maxAliases} aliases. Split it into smaller operations.`,
  depth: `This operation is nested more than ${LIMITS.maxDepth} levels deep. Request fewer nested fields.`,
  fields: `This operation selects more than ${LIMITS.maxFields.toLocaleString("en-US")} fields, counting each use of a fragment. Split it into smaller operations.`,
};

/**
 * Walks the operation with every fragment spread expanded, since that is what
 * runs: a fragment used under ten fields runs its resolvers ten times. The
 * walk stops at the first limit crossed, so a document whose fragments expand
 * exponentially costs no more than `maxFields` steps to reject.
 */
function findViolation(
  context: ValidationContext,
  operation: OperationDefinitionNode,
): Violation | null {
  const isMutation = operation.operation === "mutation";
  let mutations = 0;
  let aliases = 0;
  let fields = 0;
  const expanding = new Set<string>();

  const walk = (
    selectionSet: SelectionSetNode,
    depth: number,
  ): Violation | null => {
    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case Kind.FIELD: {
          fields += 1;
          if (selection.alias) {
            aliases += 1;
          }
          if (
            isMutation &&
            depth === 1 &&
            selection.name.value !== "__typename"
          ) {
            mutations += 1;
          }
          if (mutations > 1) {
            return "mutations";
          }
          if (aliases > LIMITS.maxAliases) {
            return "aliases";
          }
          if (depth > LIMITS.maxDepth) {
            return "depth";
          }
          if (fields > LIMITS.maxFields) {
            return "fields";
          }
          const violation = selection.selectionSet
            ? walk(selection.selectionSet, depth + 1)
            : null;
          if (violation) {
            return violation;
          }
          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const violation = walk(selection.selectionSet, depth);
          if (violation) {
            return violation;
          }
          break;
        }
        case Kind.FRAGMENT_SPREAD: {
          const name = selection.name.value;
          const fragment = context.getFragment(name);
          // Unknown and cyclic fragments are reported by graphql's own rules.
          if (!fragment || expanding.has(name)) {
            break;
          }
          expanding.add(name);
          const violation = walk(fragment.selectionSet, depth);
          expanding.delete(name);
          if (violation) {
            return violation;
          }
          break;
        }
      }
    }
    return null;
  };

  return walk(operation.selectionSet, 1);
}

export const OperationLimitsRule: ValidationRule = (context) => ({
  OperationDefinition(node) {
    const violation = findViolation(context, node);
    if (violation) {
      context.reportError(new OperationLimitError(messages[violation], node));
    }
    return false;
  },
});

/**
 * Messages on an open WebSocket skip the HTTP rate limit, so queries and
 * mutations must go over HTTP.
 */
export const SubscriptionsOnlyRule: ValidationRule = (context) => ({
  OperationDefinition(node) {
    if (node.operation !== "subscription") {
      context.reportError(
        new OperationLimitError(
          "Only subscriptions run over WebSocket. Send queries and mutations over HTTP.",
          node,
        ),
      );
    }
    return false;
  },
});

/**
 * Apollo replaces the code of every validation error with
 * `GRAPHQL_VALIDATION_FAILED`, so restore ours for clients to act on.
 */
export function formatOperationLimitError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  if (
    error instanceof GraphQLError &&
    error.originalError instanceof OperationLimitError
  ) {
    return {
      ...formattedError,
      extensions: {
        ...formattedError.extensions,
        code: OPERATION_LIMIT_EXCEEDED,
      },
    };
  }
  return formattedError;
}
