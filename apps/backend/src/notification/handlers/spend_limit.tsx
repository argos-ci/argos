import { assertNever } from "@argos/util/assertNever";
import { formatDate } from "@argos/util/date-format";
import { Section } from "react-email";
import { z } from "zod";

import config from "@/config";
import { SpendLimitThresholdSchema } from "@/database/services/spend-limit";

import {
  Button,
  EmailLayout,
  H1,
  Hi,
  Paragraph,
  Signature,
} from "../../email/components";
import { formatAmount } from "../../email/util";
import { defineNotificationHandler } from "../workflow-types";

const baseUrl = config.get("server.url");

export const handler = defineNotificationHandler({
  type: "spend_limit",
  category: "billing",
  schema: z.object({
    threshold: SpendLimitThresholdSchema,
    accountName: z.string().nullish(),
    accountSlug: z.string(),
    blockWhenSpendLimitIsReached: z.boolean(),
    spendLimit: z.number(),
    currency: z.enum(["usd", "eur"]),
    periodEndDate: z.string(),
  }),
  previewData: {
    threshold: 50,
    accountName: "Acme",
    accountSlug: "acme",
    blockWhenSpendLimitIsReached: true,
    spendLimit: 5000,
    currency: "usd",
    periodEndDate: "2026-12-12T00:00:00.000Z",
  },
  // A new team starts with a spend limit it did not set, so every email says
  // what the limit is, what it counts and how to change it.
  email: (props) => {
    const { threshold, blockWhenSpendLimitIsReached: pauses, ctx } = props;
    const accountName = props.accountName || props.accountSlug;
    const limit = (
      <strong>{formatAmount(props.spendLimit, props.currency)}</strong>
    );
    const resetDate = (
      <strong>
        {formatDate(new Date(props.periodEndDate), "longMonthDay")}
      </strong>
    );
    const spendManagementHref = new URL(
      `/${props.accountSlug}/settings/billing#spend-management`,
      baseUrl,
    ).href;

    const content = (() => {
      switch (threshold) {
        case 50:
        case 75:
          return {
            subject: `${accountName} has used ${threshold}% of its spend limit`,
            title: `${threshold}% of your spend limit used`,
            body: (
              <>
                <Paragraph>
                  Your team, <strong>{accountName}</strong>, has used{" "}
                  <strong>{threshold}%</strong> of its {limit} spend limit for
                  this billing period. The limit counts what you pay for
                  screenshots beyond the ones your plan includes.
                </Paragraph>
                <Paragraph>
                  {pauses ? (
                    <>
                      Once it is reached, your team&apos;s builds are paused
                      until the period resets on {resetDate}.
                    </>
                  ) : (
                    <>
                      Builds keep running once it is reached, and you get an
                      email when it is.
                    </>
                  )}{" "}
                  You can raise, lower or remove the limit in Spend Management.
                </Paragraph>
              </>
            ),
          };
        case 100:
          return pauses
            ? {
                subject: `${accountName} has reached its spend limit, builds are paused`,
                title: "Spend limit reached, builds paused",
                body: (
                  <>
                    <Paragraph>
                      Your team, <strong>{accountName}</strong>, has reached its{" "}
                      {limit} spend limit for this billing period, so{" "}
                      <strong>its new builds and uploads are rejected</strong>{" "}
                      and the CI jobs that upload screenshots to Argos fail.
                    </Paragraph>
                    <Paragraph>
                      Builds resume on {resetDate}, when the period resets, or
                      as soon as you raise or remove the limit in Spend
                      Management.
                    </Paragraph>
                  </>
                ),
              }
            : {
                subject: `${accountName} has reached its spend limit`,
                title: "Spend limit reached",
                body: (
                  <>
                    <Paragraph>
                      Your team, <strong>{accountName}</strong>, has reached its{" "}
                      {limit} spend limit for this billing period. Builds keep
                      running, so what you pay for additional screenshots keeps
                      growing until the period resets on {resetDate}.
                    </Paragraph>
                    <Paragraph>
                      To stop builds at the limit, turn on Pause builds in Spend
                      Management.
                    </Paragraph>
                  </>
                ),
              };
        default:
          assertNever(threshold);
      }
    })();

    return {
      subject: content.subject,
      body: (
        <EmailLayout
          preview={`${threshold}% of your ${formatAmount(props.spendLimit, props.currency)} spend limit used.`}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>{content.title}</H1>
          <Hi name={ctx.user.name} />
          {content.body}
          <Section className="my-4 text-center">
            <Button href={spendManagementHref}>Open Spend Management</Button>
          </Section>
          <Paragraph>
            Questions about your usage? Reply to this email.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
