import * as React from "react";
import { z } from "zod";

import { defineHandler } from "../workflow-types";

export const handler = defineHandler({
  name: "spend_limit",
  jsonSchema: {},
  schema: z.object({
    foo: z.string(),
  }),
  previewData: {
    foo: "example",
  },
  email: () => ({ subject: "", body: <div /> }),
});
