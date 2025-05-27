import { z } from "zod";

import { defineHandler } from "../workflow-types";

export const handler = defineHandler({
  name: "foo",
  jsonSchema: {},
  schema: z.object({
    a: z.string(),
    b: z.number(),
  }),
  previewData: {
    a: "example",
    b: 42,
  },
  email: () => ({ subject: "", body: <div /> }),
});
