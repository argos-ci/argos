import { z } from "zod";

import config from "@/config";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

function formatExpirationDate(expireAt: string, options: { time: boolean }) {
  const date = new Date(expireAt);
  if (!options.time) {
    return date.toLocaleDateString("en-US", {
      dateStyle: "long",
      timeZone: "UTC",
    });
  }
  return `${date.toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  })} UTC`;
}

export const handler = defineNotificationHandler({
  type: "project_token_expiration",
  category: "security",
  schema: z.object({
    accountSlug: z.string(),
    tokenName: z.string(),
    projectNames: z.array(z.string()).min(1),
    expireAt: z.iso.datetime(),
  }),
  previewData: {
    accountSlug: "argos",
    tokenName: "GitHub Actions",
    projectNames: ["web", "docs"],
    expireAt: "2026-11-12T09:30:00.000Z",
  },
  email: (props) => {
    const { accountSlug, tokenName, projectNames, expireAt, ctx } = props;
    const settingsUrl = new URL(
      `/${accountSlug}/settings/tokens`,
      config.get("server.url"),
    ).href;
    const projects = projectNames.map((name) => `${accountSlug}/${name}`);
    const subjectDate = formatExpirationDate(expireAt, { time: false });
    return {
      subject: `[${accountSlug}] Project token "${tokenName}" expires on ${subjectDate}`,
      body: (
        <EmailLayout
          preview={`The project token "${tokenName}" expires on ${subjectDate}.`}
        >
          <H1>Project token expires soon</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            The project token <strong>{tokenName}</strong> expires on{" "}
            <strong>{formatExpirationDate(expireAt, { time: true })}</strong>.
            From then on, Argos rejects the builds CI sends with it.
          </Paragraph>
          <Paragraph>
            It is linked to{" "}
            {projects.length === 1 ? "the project " : "the projects "}
            {projects.map((project, index) => (
              <span key={project}>
                {index > 0 ? ", " : null}
                <strong>{project}</strong>
              </span>
            ))}
            .
          </Paragraph>
          <Paragraph>
            To keep CI running, create a new token in your{" "}
            <Link href={settingsUrl}>token settings</Link>, replace{" "}
            <strong>ARGOS_TOKEN</strong> in your CI with it, then revoke this
            one.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
