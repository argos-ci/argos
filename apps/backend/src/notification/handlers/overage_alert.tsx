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
import { formatAmount } from "../../email/util";
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
    spendLimit: z.number().nullable(),
    planName: z.string(),
  }),
  previewData: {
    threshold: 200,
    currency: "usd",
    accountName: "Acme",
    accountSlug: "acme",
    spendLimit: 5000,
    planName: "Pro",
  },
  // A note, not a warning: overage is what a usage-based plan is for, so the
  // email opens on why it is sent and keeps the amount out of the subject and
  // the title, where it would read as if the team had done something wrong.
  email: (props) => {
    const { threshold, currency, spendLimit, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const amount = formatAmount(threshold, currency);
    const isLast = threshold === 500;
    const settingsHref = new URL(
      `/${props.accountSlug}/settings/billing`,
      baseUrl,
    ).href;
    const spendManagementHref = new URL(
      `/${props.accountSlug}/settings/billing#spend-management`,
      baseUrl,
    ).href;
    const opening = (
      <Paragraph>
        A quick update on your usage, so your next invoice holds no surprise.
      </Paragraph>
    );
    const content = (() => {
      switch (threshold) {
        case 200: {
          return (
            <>
              {opening}
              <Paragraph>
                Your team, <strong>{accountName}</strong>, now has {amount} of
                usage beyond its plan this billing period. It is billed at your
                plan’s rates and will appear on your next invoice.
              </Paragraph>
              {spendLimit === null ? (
                <Paragraph>
                  If you would like more visibility on your usage, you can set a
                  spend limit from your team settings. Argos then lets you know
                  at 50%, 75% and 100% of the amount you choose, and can pause
                  builds at that point if you prefer. Learn more about{" "}
                  <Link href={spendManagementDocsHref}>spend management</Link>.
                </Paragraph>
              ) : null}
            </>
          );
        }
        case 500: {
          return (
            <>
              {opening}
              <Paragraph>
                Your team, <strong>{accountName}</strong>, now has {amount} of
                usage beyond its plan this billing period, billed at your plan’s
                rates on your next invoice. This is the last of these notes.
              </Paragraph>
              <Paragraph>
                {spendLimit === null ? (
                  <>
                    If you would like to keep track of your usage as it grows,
                    you can set a spend limit: Argos then lets you know at 50%,
                    75% and 100% of the amount you choose, and can pause builds
                    at that point if you prefer.
                  </>
                ) : (
                  <>
                    Your {props.planName} plan is capped at{" "}
                    {formatAmount(spendLimit, currency)} of overage per billing
                    period, and you can change this amount in Spend Management.
                  </>
                )}
              </Paragraph>
            </>
          );
        }
        default:
          assertNever(threshold);
      }
    })();
    return {
      subject: isLast
        ? `A last note on ${accountName}’s usage this billing period`
        : `A note on ${accountName}’s usage this billing period`,
      body: (
        <EmailLayout
          preview="A quick update on your usage, so your next invoice holds no surprise."
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>
            {isLast ? "A last note on your usage" : "A note on your usage"}
          </H1>
          <Hi name={ctx.user.name} />
          {content}
          {/* The first note to a team with a spend limit asks for nothing, so
              it has no button. */}
          {spendLimit === null || isLast ? (
            <Section className="my-4 text-center">
              <Button href={spendManagementHref}>
                {spendLimit === null
                  ? "Set up spend management"
                  : "Open Spend Management"}
              </Button>
            </Section>
          ) : null}
          <Paragraph>
            You can check your current usage at any time in your{" "}
            <Link href={settingsHref}>team settings</Link>. If you have any
            questions about your usage or your plan, reply to this email.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
