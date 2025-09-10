import { z } from "zod";

export const LocationSchema = z
  .object({
    city: z.string(),
    country: z.string(),
    ip: z.string(),
  })
  .nullable();

export const AvatarSchema = z.object({
  url: z.url().nullable(),
  initial: z.string().min(1),
  color: z.string(),
});
