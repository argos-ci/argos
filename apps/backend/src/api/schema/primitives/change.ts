import { z } from "zod";

export const ChangeSchema = z
  .object({
    id: z.string().meta({
      description:
        "Unique identifier of the change (a test + fingerprint pair). Use it with the ignore/unignore endpoints.",
    }),
    ignored: z.boolean().meta({
      description:
        "Whether this change is currently ignored. Ignored changes no longer require review and are automatically approved.",
    }),
    occurrences: z.number().meta({
      description:
        "Number of times this change has been seen over the metrics period. A high count for a recurring change is a strong flakiness signal.",
    }),
  })
  .meta({
    description:
      "A test change: a specific visual difference (fingerprint) of a test that can be ignored to silence flaky changes.",
    id: "Change",
  });

export type SerializedChange = z.infer<typeof ChangeSchema>;
