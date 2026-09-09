import { assertNever } from "@argos/util/assertNever";
import { Section } from "react-email";
import { z } from "zod";

import config from "@/config";
import { OverageAlertThresholdSchema } from "@/database/services/overage-alert";

import {
  Button,
  EmailLayout,
  H1,
  Hi,
  Link,
  Paragraph,
  Signature,
} from "../../email/components";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

const spendManagementDocsHref =
  "https://argos-ci.com/docs/learn/billing-and-subscription/spend-management";

export const handler = defineNotificationHandler({
  type: "overage_alert",
  category: "billing",
  schema: z.object({
    threshold: OverageAlertThresholdSchema,
    currency: z.enum(["usd", "eur"]),
    accountName: z.string().nullish(),
    accountSlug: z.string(),
  }),
  previewData: {
    threshold: 200,
    currency: "usd",
    accountName: "Argos",
    accountSlug: "argos",
  },
  email: (props) => {
    const { threshold, currency, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(threshold);
    const settingsHref = new URL(
      `/${props.accountSlug}/settings#spend-management`,
      baseUrl,
    ).href;
    return {
      subject: `Your team has reached ${amount} of additional screenshot usage`,
      body: (
        <EmailLayout
          preview={`${accountName} has spent ${amount} on additional screenshots this billing period, and no spend limit is set.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>Your team has reached {amount} of additional screenshot usage</H1>
          <Hi name={ctx.user.name} />
          <Paragraph>
            Your team, <strong>{accountName}</strong>, has used more screenshots
            than its plan includes this billing period. The additional
            screenshots now amount to <strong>{amount}</strong>, billed at your
            plan’s per-screenshot rate on your next invoice. Your builds keep
            running.
          </Paragraph>
          {(() => {
            switch (threshold) {
              case 200: {
                return (
                  <Paragraph>
                    <strong>No spend limit is set on your team</strong>, so
                    nothing caps this cost. Set a spend amount and Argos
                    notifies you at 50%, 75% and 100% of it, and can pause
                    builds once it is reached, so your invoice never goes above
                    what you expect.
                  </Paragraph>
                );
              }
              case 500: {
                return (
                  <Paragraph>
                    <strong>No spend limit is set on your team</strong>, and
                    this is the last alert Argos sends without one. Set a spend
                    amount to stay informed: Argos then notifies you at 50%, 75%
                    and 100% of it, and can pause builds once it is reached.
                  </Paragraph>
                );
              }
              default:
                assertNever(threshold);
            }
          })()}
          <Section className="my-4 text-center">
            <Button href={settingsHref}>Set up spend management</Button>
          </Section>
          <Paragraph>
            It takes a minute from your team settings. Learn more about{" "}
            <Link href={spendManagementDocsHref}>spend management</Link> in the
            documentation.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
