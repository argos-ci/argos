import { render } from "react-email";
import { describe, expect, it } from "vitest";

import type { NotificationHandler } from "../workflow-types";
import { notificationHandlers } from "./index";

describe("notification handlers", () => {
  const handlers: NotificationHandler[] = notificationHandlers;

  handlers.forEach((handler) => {
    it(`renders ${handler.type} from its preview data`, async () => {
      expect(
        handler.schema.safeParse(handler.previewData).error,
      ).toBeUndefined();

      const rendered = handler.email({
        ...handler.previewData,
        ctx: {
          user: { id: "preview-user", name: "James" },
          preferencesUrl: null,
        },
      });

      expect(rendered.subject).toBeTruthy();
      await expect(render(rendered.body)).resolves.toContain("<html");
    });
  });
});
