import type { JSONSchema } from "objection";

export const timestampsSchema: JSONSchema = {
  type: "object",
  required: [],
  properties: {
    id: {
      type: "string",
    },
    createdAt: {
      type: "string",
    },
    updatedAt: {
      type: "string",
    },
  },
};

const jobStatuses = [
  "pending",
  "progress",
  "complete",
  "error",
  "aborted",
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const jobModelSchema: JSONSchema = {
  type: "object",
  required: ["jobStatus"],
  properties: {
    jobStatus: {
      type: "string",
      enum: jobStatuses as unknown as string[],
    },
  },
};
