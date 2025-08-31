import { z } from "zod";

export const LocationSchema = z
  .object({
    city: z.string(),
    country: z.string(),
  })
  .nullable();
