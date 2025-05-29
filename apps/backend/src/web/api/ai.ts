import { openai } from "@ai-sdk/openai";
import { invariant } from "@argos/util/invariant";
import { streamText } from "ai";
import { Router } from "express";

import { ScreenshotDiff } from "@/database/models";
import { getPublicImageFileUrl } from "@/storage";

import { allowApp } from "../middlewares/cors";

const router: Router = Router();

router.use(allowApp);

router.post("/diffs/:diffId/roast", async (req, res) => {
  const { diffId } = req.params;
  const diff = await ScreenshotDiff.query()
    .findById(diffId)
    .withGraphFetched("[file,baseScreenshot.file,compareScreenshot.file]")
    .throwIfNotFound();

  console.log("Roasting diff", diffId);

  invariant(diff?.file, "Base screenshot must exist");
  invariant(diff.baseScreenshot?.file, "Base screenshot must exist");
  invariant(diff.compareScreenshot?.file, "Compare screenshot must exist");

  console.log("Starting AI roast for diff", diffId);

  const [baseScreenshot, compareScreenshot, diffScreenshot] = await Promise.all(
    [
      getPublicImageFileUrl(diff.baseScreenshot.file),
      getPublicImageFileUrl(diff.compareScreenshot.file),
      getPublicImageFileUrl(diff.file),
    ],
  );

  console.log(
    {
      type: "image",
      image: new URL(baseScreenshot),
    },
    {
      type: "image",
      image: new URL(compareScreenshot),
    },
    {
      type: "image",
      image: new URL(diffScreenshot),
    },
  );

  const result = streamText({
    model: openai("o4-mini"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: new URL(baseScreenshot),
          },
          {
            type: "image",
            image: new URL(compareScreenshot),
          },
          {
            type: "image",
            image: new URL(diffScreenshot),
          },
          {
            type: "text",
            text: `
The three images represent in order:
1. The original screenshot before the changes.
2. The new screenshot after the changes.
3. The diff screenshot highlighting the changes.

Review the UI changes and provide UX feedback.
Focus on clarity, usability, consistency, and potential confusion for users.
Be short and concise, ideally under 100 words.
            `,
          },
        ],
      },
    ],
  });

  result.pipeDataStreamToResponse(res);
});

export default router;
