import * as React from "react";
import { z } from "zod";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

export const handler = defineNotificationHandler({
  type: "invalid_gitlab_token",
  schema: z.object({
    account: z.object({
      name: z.string(),
      settingsURL: z.url(),
    }),
  }),
  previewData: {
    account: {
      name: "Acme Corp",
      settingsURL: new URL(
        "https://argos-ci.com/acme-corp/settings",
      ).toString(),
    },
  },
  email: (props) => {
    const { account, ctx } = props;
    return {
      subject: `[Action required] GitLab token for account ${account.name} is no longer valid`,
      body: (
        <EmailLayout
          preview={`The GitLab token for account ${account.name} is no longer valid.`}
        >
          <H1>GitLab token invalid</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            We noticed that the GitLab token for your{" "}
            <strong>{account.name}</strong> account is no longer valid. This
            usually happens when a token has expired or been revoked.
          </Paragraph>
          <Paragraph>
            To continue using Argos without interruption, please{" "}
            <Link href={account.settingsURL}>update your GitLab token</Link>.
          </Paragraph>
          <Paragraph>
            If you need any help while updating, just{" "}
            <Link href="https://argos-ci.com/docs/contact-us">contact us</Link>{" "}
            we’ll be happy to assist.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
