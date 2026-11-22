/**
 * The MCP events extension (SEP-3415, `io.modelcontextprotocol/events`), poll
 * delivery only. See the README.
 */
import {
  PROJECT_EVENT_DESCRIPTIONS,
  PROJECT_EVENTS,
  ProjectEventNameSchema,
} from "@argos/schemas/project-event";
import {
  ProtocolError,
  ProtocolErrorCode,
  type McpServer,
} from "@modelcontextprotocol/server";
import { z } from "zod";

import { EVENT_SCHEMAS } from "@/api/schema/primitives/event";
import { AccountSlug, ProjectName } from "@/api/schema/primitives/project";
import { MAX_EVENTS_PER_PAGE } from "@/event/feed";

import { formatApiError, getFromApi } from "./dispatch";

export const EVENTS_EXTENSION_ID = "io.modelcontextprotocol/events";

/** Error codes the extension defines (SEP-3415). */
const EventsErrorCode = {
  NotFound: -32023,
  Forbidden: -32024,
} as const;

/** How often a client is told to poll when it is caught up. */
const POLL_INTERVAL_MS = 30_000;

const EventArgumentsSchema = z.object({
  owner: AccountSlug.meta({
    description: "The slug of the account owning the project.",
  }),
  project: ProjectName.meta({ description: "The name of the project." }),
});

const EVENT_DEFINITIONS = PROJECT_EVENTS.map((name) => ({
  name,
  description: PROJECT_EVENT_DESCRIPTIONS[name],
  delivery: ["poll"],
  inputSchema: z.toJSONSchema(EventArgumentsSchema, { io: "input" }),
  payloadSchema: z.toJSONSchema(EVENT_SCHEMAS[name].shape.data, {
    io: "output",
    unrepresentable: "any",
  }),
}));

const ListEventsParamsSchema = z
  .object({ cursor: z.string().optional() })
  .loose();

const PollEventsParamsSchema = z
  .object({
    name: z.string(),
    arguments: z.unknown().optional(),
    cursor: z.string().nullable(),
    maxAgeMs: z.number().int().min(0).optional(),
    maxEvents: z.number().int().min(1).optional(),
  })
  .loose();

const FeedResponseSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      timestamp: z.string(),
      data: z.record(z.string(), z.unknown()),
    }),
  ),
  cursor: z.string(),
  truncated: z.boolean(),
  hasMore: z.boolean(),
});

function toProtocolError(status: number, payload: string): ProtocolError {
  const message = formatApiError(payload);
  switch (status) {
    case 400:
      return new ProtocolError(ProtocolErrorCode.InvalidParams, message);
    case 401:
    case 403:
      return new ProtocolError(EventsErrorCode.Forbidden, message);
    case 404:
      return new ProtocolError(EventsErrorCode.NotFound, message);
    default:
      return new ProtocolError(ProtocolErrorCode.InternalError, message);
  }
}

async function pollEvents(
  params: z.infer<typeof PollEventsParamsSchema>,
  authorization: string,
) {
  const name = ProjectEventNameSchema.safeParse(params.name);
  if (!name.success) {
    throw new ProtocolError(
      EventsErrorCode.NotFound,
      `Unknown event "${params.name}". Call events/list for the available ones.`,
    );
  }
  const args = EventArgumentsSchema.safeParse(params.arguments);
  if (!args.success) {
    throw new ProtocolError(
      ProtocolErrorCode.InvalidParams,
      `Invalid arguments: ${z.prettifyError(args.error)}`,
    );
  }

  const query = new URLSearchParams({
    name: name.data,
    limit: String(
      Math.min(params.maxEvents ?? MAX_EVENTS_PER_PAGE, MAX_EVENTS_PER_PAGE),
    ),
  });
  if (params.cursor !== null) {
    query.set("cursor", params.cursor);
    // A replay floor only applies to a cursor: without one, polling starts
    // now.
    if (params.maxAgeMs !== undefined) {
      query.set("maxAgeMs", String(params.maxAgeMs));
    }
  }
  const { owner, project } = args.data;
  const { status, payload } = await getFromApi(
    `/projects/${encodeURIComponent(owner)}/${encodeURIComponent(project)}/events?${query}`,
    authorization,
  );
  if (status !== 200) {
    throw toProtocolError(status, payload);
  }

  const page = FeedResponseSchema.parse(JSON.parse(payload));
  return {
    resultType: "complete",
    events: page.events.map((event) => ({
      eventId: event.id,
      name: event.type,
      timestamp: event.timestamp,
      data: event.data,
    })),
    cursor: page.cursor,
    truncated: page.truncated,
    hasMore: page.hasMore,
    nextPollMs: page.hasMore ? 0 : POLL_INTERVAL_MS,
  };
}

/**
 * Serve `events/list` and `events/poll` on a server. The capability itself is
 * declared with the others (see `MCP_SERVER_CAPABILITIES`), so the Server
 * Card lists it too.
 */
export function registerEventsExtension(
  mcp: McpServer,
  authorization: string,
): void {
  mcp.server.setRequestHandler(
    "events/list",
    { params: ListEventsParamsSchema },
    () => ({ resultType: "complete", events: EVENT_DEFINITIONS }),
  );
  mcp.server.setRequestHandler(
    "events/poll",
    { params: PollEventsParamsSchema },
    (params) => pollEvents(params, authorization),
  );
}
