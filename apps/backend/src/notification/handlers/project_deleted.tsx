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

const baseUrl = config.get("server.url");

export const handler = defineNotificationHandler({
  type: "project_deleted",
  schema: z.object({
    accountType: z.enum(["user", "team"]),
    accountName: z.string().nullable().optional(),
    accountSlug: z.string(),
    projectName: z.string(),
  }),
  previewData: {
    accountType: "team",
    accountName: "Argos",
    accountSlug: "argos",
    projectName: "my-project",
  },
  email: (props) => {
    const accountName = props.accountName || props.accountSlug;
    const accountHref = new URL(`/${props.accountSlug}`, baseUrl).href;
    const isPersonal = props.accountType === "user";
    const fromLabel = isPersonal ? (
      <strong>your personal account</strong>
    ) : (
      <>
        <strong>{accountName}</strong> team
      </>
    );
    const reviewLabel = isPersonal
      ? "your personal dashboard"
      : `${accountName} dashboard`;
    return {
      subject: `Project deleted: ${props.projectName}`,
      body: (
        <EmailLayout
          preview={`The project ${props.projectName} was deleted from ${fromLabel} team.`}
        >
          <H1>Project deleted</H1>
          <Hi name={props.ctx.user.name} />
          <Paragraph>
            The project <strong>{props.projectName}</strong> has been deleted
            from {fromLabel}.
          </Paragraph>
          <Paragraph>
            You can access your remaining projects from{" "}
            <Link href={accountHref}>{reviewLabel}</Link>.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
