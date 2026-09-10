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
  // A heads-up, not a warning: the overage is what a usage-based plan is for,
  // so the copy informs about the coming invoice instead of urging a cap. It
  // says "overage", never what is metered, so billing something new does not
  // date it.
  email: (props) => {
    const { threshold, currency, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const formatAmount = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    const amount = formatAmount(threshold);
    const settingsHref = new URL(`/${props.accountSlug}/settings`, baseUrl)
      .href;
    const spendManagementHref = new URL(
      `/${props.accountSlug}/settings#spend-management`,
      baseUrl,
    ).href;
    const content = (() => {
      switch (threshold) {
        case 200: {
          return {
            intro: (
              <>
                <Paragraph>
                  Your team, <strong>{accountName}</strong>, has used everything
                  its plan includes this billing period, and the usage beyond
                  that comes to <strong>{amount} of overage</strong> so far. It
                  is billed at your plan’s rates and will appear on your next
                  invoice.
                </Paragraph>
                <Paragraph>
                  This is exactly what your usage-based plan is for:{" "}
                  <strong>your builds keep running</strong>, and you only pay
                  for what your team actually uses. We simply want to make sure
                  nothing on your invoice comes as a surprise.
                </Paragraph>
                <Paragraph>
                  If you would like more visibility on this, you can{" "}
                  <strong>set a spend limit</strong> from your team settings.
                  Argos will then let you know when your overage reaches{" "}
                  <strong>50%, 75% and 100%</strong> of the amount you choose,
                  and can pause builds at that point if you prefer.
                </Paragraph>
              </>
            ),
            outro: (
              <Paragraph>
                You can check your current usage at any time in your{" "}
                <Link href={settingsHref}>team settings</Link>, and learn more
                about{" "}
                <Link href={spendManagementDocsHref}>spend management</Link> in
                the documentation. If you have any questions about your usage or
                your plan, don’t hesitate to reach out.
              </Paragraph>
            ),
          };
        }
        case 500: {
          return {
            intro: (
              <>
                <Paragraph>
                  Your team, <strong>{accountName}</strong>, is now at{" "}
                  <strong>{amount} of overage</strong> this billing period, for
                  usage beyond what its plan includes. It is billed at your
                  plan’s rates on your next invoice, and{" "}
                  <strong>your builds keep running</strong>.
                </Paragraph>
                <Paragraph>
                  Argos sends this heads-up at {formatAmount(200)} and {amount}{" "}
                  of overage, and{" "}
                  <strong>this is the second and last one</strong>. If you would
                  like to keep being notified as your usage grows, you can{" "}
                  <strong>set a spend limit</strong>: Argos will then let you
                  know at 50%, 75% and 100% of the amount you choose, and can
                  pause builds at that point if you prefer.
                </Paragraph>
              </>
            ),
            outro: (
              <Paragraph>
                If you have any questions about your usage or your plan, don’t
                hesitate to reach out.
              </Paragraph>
            ),
          };
        }
        default:
          assertNever(threshold);
      }
    })();
    return {
      subject: `Heads-up: ${amount} of overage this billing period`,
      body: (
        <EmailLayout
          preview={`A quick update on ${accountName}’s usage, so your next invoice holds no surprise.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>{amount} of overage this billing period</H1>
          <Hi name={ctx.user.name} />
          {content.intro}
          <Section className="my-4 text-center">
            <Button href={spendManagementHref}>Set up spend management</Button>
          </Section>
          {content.outro}
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
