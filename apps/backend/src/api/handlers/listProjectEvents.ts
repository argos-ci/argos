import { ProjectEventNameSchema } from "@argos/schemas/project-event";
import { z } from "zod";
import { ZodOpenApiOperationObject } from "zod-openapi";

import {
  EVENT_RETENTION_DAYS,
  listProjectEvents,
  MAX_EVENTS_PER_PAGE,
} from "@/event/feed";

import { getProjectForAuth, VIEW_PROJECT_ACCESS } from "../auth/project";
import { EventSchema, serializeEvent } from "../schema/primitives/event";
import { AccountSlug, ProjectName } from "../schema/primitives/project";
import {
  forbidden,
  invalidParameters,
  notFound,
  serverError,
  unauthorized,
} from "../schema/util/error";
import { anyTokenOrOAuthAuth } from "../security";
import { CreateAPIHandler } from "../util";

const ProjectEventsQuerySchema = z.object({
  name: ProjectEventNameSchema.optional().meta({
    description: "Only return the events of this type.",
  }),
  cursor: z.string().optional().meta({
    description:
      "The `cursor` of the previous response. Without it, the feed starts now: the response has no events, only the cursor to read the next ones with.",
  }),
  maxAgeMs: z
    .string()
    .optional()
    .transform((value) =>
      z.coerce.number().int().min(0).optional().parse(value),
    )
    .meta({
      description:
        "Skip the events older than this many milliseconds. Without a cursor, the feed starts that long ago instead of now.",
    }),
  limit: z
    .string()
    .optional()
    .transform((value) =>
      z.coerce
        .number()
        .int()
        .min(1)
        .max(MAX_EVENTS_PER_PAGE)
        .default(MAX_EVENTS_PER_PAGE)
        .parse(value),
    )
    .meta({
      description: `Maximum number of events to return (max ${MAX_EVENTS_PER_PAGE}).`,
    }),
});

export const listProjectEventsOperation = {
  operationId: "listProjectEvents",
  summary: "List a project's events",
  description: `Read the events of a project in the order they happened: builds completing and getting reviewed, deployments being created and becoming ready. Each event has the same shape as the body of a webhook request.\n\nThe list is a feed: pass the \`cursor\` of each response to the next request to get the events that happened since. When \`hasMore\` is true, request again right away. Events are kept ${EVENT_RETENTION_DAYS} days: \`truncated\` is true when some were deleted before you read them.`,
  tags: ["Events"],
  security: anyTokenOrOAuthAuth(["projects:read"]),
  requestParams: {
    path: z.object({
      owner: AccountSlug,
      project: ProjectName,
    }),
    query: ProjectEventsQuerySchema,
  },
  responses: {
    "200": {
      description: "The events after the cursor",
      content: {
        "application/json": {
          schema: z.object({
            events: z.array(EventSchema),
            cursor: z.string().meta({
              description: "Pass it as `cursor` to read the next events.",
            }),
            truncated: z.boolean().meta({
              description:
                "Whether events after the given cursor were deleted before being read.",
            }),
            hasMore: z.boolean().meta({
              description: "Whether more events are ready to be read now.",
            }),
          }),
        },
      },
    },
    "400": invalidParameters,
    "401": unauthorized,
    "403": forbidden,
    "404": notFound,
    "500": serverError,
  },
} satisfies ZodOpenApiOperationObject;

export const listProjectEventsHandler: CreateAPIHandler = ({ get }) => {
  get("/projects/{owner}/{project}/events", async (req, res) => {
    const project = await getProjectForAuth(
      req.ctx.auth(),
      req.ctx.params,
      VIEW_PROJECT_ACCESS,
    );
    const page = await listProjectEvents({
      projectId: project.id,
      ...req.ctx.query,
    });
    res.send({ ...page, events: page.events.map(serializeEvent) });
  });
};
