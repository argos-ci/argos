import { z } from "zod";

export const TestId = z.string().meta({
  description: "The test identifier, as returned in a diff's `test.id`",
  example: "WEB-xf23d",
  id: "TestId",
});
