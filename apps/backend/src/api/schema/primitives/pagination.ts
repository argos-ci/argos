import { z } from "zod";

export const PageParamsSchema = z
  .object({
    perPage: z
      .string()
      .optional()
      .transform((value) =>
        z.coerce.number().min(1).max(100).default(30).parse(value),
      )
      .meta({
        description: "Number of items per page (max 100)",
      }),
    page: z
      .string()
      .optional()
      .transform((value) => z.coerce.number().min(1).default(1).parse(value))
      .meta({
        description: "Page number",
      }),
  })
  .meta({
    description: "Page parameters",
    id: "PageParams",
  });

const PageInfoSchema = z
  .object({
    total: z.number().meta({
      description: "Total number of items",
    }),
    page: z.number().meta({
      description: "Current page number",
    }),
    perPage: z.number().meta({
      description: "Number of items per page",
    }),
  })
  .meta({
    description: "Page information",
    id: "PageInfo",
  });

export function paginated<T>(schema: z.ZodType<T>) {
  return z.object({
    pageInfo: PageInfoSchema,
    results: z.array(schema),
  });
}
