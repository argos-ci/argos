import { z } from "../util/zod.js";

export const PageParamsSchema = z.object({
  perPage: z
    .string()
    .optional()
    .pipe(z.coerce.number().min(1).max(100).default(30))
    .openapi({
      description: "Number of items per page (max 100)",
    }),
  page: z
    .string()
    .optional()
    .pipe(z.coerce.number().min(1).default(1))
    .openapi({
      description: "Page number",
    }),
});

const PageInfoSchema = z.object({
  total: z.number(),
  page: z.number(),
  perPage: z.number(),
});

export function paginated<T>(schema: z.ZodType<T>) {
  return z.object({
    pageInfo: PageInfoSchema,
    results: z.array(schema),
  });
}
