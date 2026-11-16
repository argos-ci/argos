import type { ProjectEventName } from "@argos/schemas/project-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import type {
  Build,
  BuildReview,
  Deployment,
  Project,
  ProjectEvent,
} from "@/database/models";

import { BuildSchema, serializeBuild } from "./build";
import { BuildReviewSchema, serializeBuildReview } from "./buildReview";
import { DeploymentSchema, serializeDeployment } from "./deployment";

const EventProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    account: z.object({ id: z.string(), slug: z.string() }),
    url: z.url().meta({ description: "The URL of the project in Argos." }),
  })
  .meta({
    id: "EventProject",
    description: "The project the event happened in.",
  });

const BuildEventDataSchema = z.object({
  project: EventProjectSchema,
  build: BuildSchema,
});

const BuildReviewedEventDataSchema = z.object({
  project: EventProjectSchema,
  build: BuildSchema,
  review: BuildReviewSchema,
});

const DeploymentEventDataSchema = z.object({
  project: EventProjectSchema,
  deployment: DeploymentSchema,
});

/**
 * Every event type: what it means and the shape of its `data`. Webhooks, the
 * events feed and the MCP events extension all describe events from here.
 */
export const EVENT_TYPES = {
  "build.completed": {
    description: "A build finishes comparing its screenshots.",
    data: BuildEventDataSchema,
  },
  "build.reviewed": {
    description: "A build receives a review.",
    data: BuildReviewedEventDataSchema,
  },
  "deployment.created": {
    description: "A deployment starts uploading its files.",
    data: DeploymentEventDataSchema,
  },
  "deployment.ready": {
    description: "A deployment is ready to be served.",
    data: DeploymentEventDataSchema,
  },
} satisfies Record<
  ProjectEventName,
  { description: string; data: z.ZodObject }
>;

function createEventSchema<
  TName extends ProjectEventName,
  TData extends z.ZodObject,
>(name: TName, data: TData, id: string) {
  return z
    .object({
      id: z.string().meta({
        description:
          "Unique identifier of the event, the same on every delivery of it. Use it to ignore an event you already processed.",
      }),
      type: z.literal(name),
      timestamp: z.iso.datetime().meta({
        description: "When the event happened.",
      }),
      data,
    })
    .meta({ id, description: EVENT_TYPES[name].description });
}

export const EVENT_SCHEMAS = {
  "build.completed": createEventSchema(
    "build.completed",
    BuildEventDataSchema,
    "BuildCompletedEvent",
  ),
  "build.reviewed": createEventSchema(
    "build.reviewed",
    BuildReviewedEventDataSchema,
    "BuildReviewedEvent",
  ),
  "deployment.created": createEventSchema(
    "deployment.created",
    DeploymentEventDataSchema,
    "DeploymentCreatedEvent",
  ),
  "deployment.ready": createEventSchema(
    "deployment.ready",
    DeploymentEventDataSchema,
    "DeploymentReadyEvent",
  ),
} satisfies { [N in ProjectEventName]: z.ZodObject };

export const EventSchema = z
  .discriminatedUnion("type", [
    EVENT_SCHEMAS["build.completed"],
    EVENT_SCHEMAS["build.reviewed"],
    EVENT_SCHEMAS["deployment.created"],
    EVENT_SCHEMAS["deployment.ready"],
  ])
  .meta({
    id: "Event",
    description: "Something that happened in a project.",
  });

export type EventMessage =
  | { name: "build.completed"; build: Build }
  | { name: "build.reviewed"; build: Build; buildReview: BuildReview }
  | { name: "deployment.created" | "deployment.ready"; deployment: Deployment };

export function getEventProjectId(message: EventMessage): string {
  switch (message.name) {
    case "build.completed":
    case "build.reviewed":
      return message.build.projectId;
    case "deployment.created":
    case "deployment.ready":
      return message.deployment.projectId;
    default:
      return assertNever(message);
  }
}

async function serializeEventProject(
  project: Project,
): Promise<z.infer<typeof EventProjectSchema>> {
  const url = await project.getUrl();
  invariant(project.account, "account is not fetched");
  return {
    id: project.id,
    name: project.name,
    account: { id: project.account.id, slug: project.account.slug },
    url,
  };
}

type EventData = z.infer<
  (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]["data"]
>;

/**
 * The `data` of an event, as it is when the event happens.
 */
export async function serializeEventData(
  message: EventMessage,
  project: Project,
): Promise<EventData> {
  const projectData = await serializeEventProject(project);
  switch (message.name) {
    case "build.completed":
      return {
        project: projectData,
        build: await serializeBuild(message.build),
      } satisfies z.infer<typeof BuildEventDataSchema>;
    case "build.reviewed": {
      const [build, review] = await Promise.all([
        serializeBuild(message.build),
        serializeBuildReview(message.buildReview),
      ]);
      return {
        project: projectData,
        build,
        review,
      } satisfies z.infer<typeof BuildReviewedEventDataSchema>;
    }
    case "deployment.created":
    case "deployment.ready":
      return {
        project: projectData,
        deployment: serializeDeployment(message.deployment),
      } satisfies z.infer<typeof DeploymentEventDataSchema>;
    default:
      return assertNever(message);
  }
}

/**
 * A stored event in its public shape: the body of a webhook request, and an
 * item of the events feed.
 */
export function serializeEvent(
  event: ProjectEvent,
): z.infer<typeof EventSchema> {
  // `data` was written by `serializeEventData` for this `name`. Parsing it
  // back would reject the events stored before a field was added to their
  // schema, for as long as they are kept.
  return {
    id: event.id,
    type: event.name,
    timestamp: new Date(event.createdAt).toISOString(),
    data: event.data,
  } as z.infer<typeof EventSchema>;
}
