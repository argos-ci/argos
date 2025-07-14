import { z } from "zod";

const ErrorSchema = z
  .object({
    error: z.string(),
    details: z.array(z.object({ message: z.string() })).optional(),
  })
  .meta({
    description: "Error response",
    id: "Error",
  });

function createErrorResponse(description: string) {
  return {
    description,
    content: {
      "application/json": {
        schema: ErrorSchema,
      },
    },
  };
}

export const invalidParameters = createErrorResponse("Invalid parameters");
export const unauthorized = createErrorResponse("Unauthorized");
export const serverError = createErrorResponse("Server error");
export const conflict = createErrorResponse("Conflict");
export const notFound = createErrorResponse("Not found");
export const forbidden = createErrorResponse("Forbidden");
