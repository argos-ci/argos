import * as React from "react";
import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import config from "@/config";
import { SpendLimitThresholdSchema } from "@/database/services/spend-limit";

import {
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../email-components";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

export const handler = defineNotificationHandler({
  type: "spend_limit",
  schema: z.object({
    threshold: SpendLimitThresholdSchema,
    accountName: z.string().nullable().optional(),
    accountSlug: z.string(),
    blockWhenSpendLimitIsReached: z.boolean(),
  }),
  previewData: {
    threshold: 100,
    accountName: "Argos",
    accountSlug: "argos",
    blockWhenSpendLimitIsReached: true,
  },
  email: (props) => {
    const { threshold, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const settingsHref = new URL(`/${props.accountSlug}/settings`, baseUrl)
      .href;
    return {
      subject: `Your team has reached ${threshold}% of its spend limit`,
      body: (
        <EmailLayout
          preview={`You’re at ${threshold}% of your spend limit for this cycle. Check your usage now.`}
        >
          <H1>Your team has reached {threshold}% of its spend limit</H1>
          <Hi ctx={ctx} />
          {(() => {
            switch (threshold) {
              case 50: {
                return (
                  <>
                    <Paragraph>
                      We wanted to let you know that your team,{" "}
                      <strong>{accountName}</strong>, has reached{" "}
                      <strong>50%</strong> of its allocated spend for this
                      billing cycle.
                    </Paragraph>
                    <Paragraph>
                      This is just a friendly reminder to help you monitor your
                      usage and avoid any surprises. If you’d like to review
                      your current usage details or adjust your plan, feel free
                      to visit your{" "}
                      <Link href={settingsHref}>team settings</Link>.
                    </Paragraph>
                  </>
                );
              }
              case 75: {
                return (
                  <>
                    <Paragraph>
                      Heads up! Your team, <strong>{accountName}</strong>, has
                      now reached <strong>75%</strong> of its allocated spend
                      for this billing cycle.
                    </Paragraph>
                    <Paragraph>
                      We recommend keeping an eye on your remaining usage. If
                      you think you might exceed your limit, you can{" "}
                      <Link href={settingsHref}>
                        adjust your spend limit in the team settings
                      </Link>
                      .
                    </Paragraph>
                  </>
                );
              }
              case 100: {
                return (
                  <>
                    <Paragraph>
                      Your team, <strong>{accountName}</strong>, has now reached{" "}
                      <strong>100%</strong> of its allocated spend for this
                      billing cycle.
                    </Paragraph>
                    {props.blockWhenSpendLimitIsReached ? (
                      <Paragraph>
                        To prevent any further charges,{" "}
                        <strong>all builds have been paused</strong>. Please
                        review your current usage or disable the pause in the{" "}
                        <Link href={settingsHref}>team settings</Link> to
                        continue to use Argos.
                      </Paragraph>
                    ) : (
                      <Paragraph>
                        <strong>
                          You can continue to create builds and usage may
                          increase above your limit.
                        </strong>{" "}
                        Please review your current usage or adjust your spend
                        limit in the{" "}
                        <Link href={settingsHref}>team settings</Link>.
                      </Paragraph>
                    )}
                  </>
                );
              }
              default:
                assertNever(threshold);
            }
          })()}
          <Paragraph>
            If you have any questions or need assistance, don’t hesitate to
            reach out.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
