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
    const spendManagementLink = (
      <Link href={spendManagementHref}>Spend Management</Link>
    );
    const teamSettingsLink = <Link href={settingsHref}>team settings</Link>;
    // The first note to a team with a spend limit says where to see usage and
    // change the limit in one line; the others give usage a line of its own.
    const isCombined = spendLimit !== null && !isLast;
    const limit =
      spendLimit === null ? (
        <Paragraph>
          {isLast
            ? "If you would like to keep track of your usage as it grows, you can set a spend limit in "
            : "If you would like more visibility on your usage, you can set a spend limit in "}
          {spendManagementLink}. Argos then lets you know at 50%, 75% and 100%
          of the amount you choose, and can pause builds at that point if you
          prefer. Learn more in the{" "}
          <Link href={spendManagementDocsHref}>documentation</Link>.
        </Paragraph>
      ) : isLast ? (
        <Paragraph>
          The {props.planName} plan is limited to{" "}
          {formatAmount(spendLimit, currency)} of overage. You can change this
          amount in {spendManagementLink}.
        </Paragraph>
      ) : (
        <Paragraph>
          You can check your current usage in your {teamSettingsLink} and you
          can change your spend limit in {spendManagementLink}.
        </Paragraph>
      );
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
          {opening}
          <Paragraph>
            Your team, <strong>{accountName}</strong>, now has {amount} of usage
            beyond its plan this billing period.
          </Paragraph>
          {limit}
          {/* A team with a spend limit is told where to change it, in a
              link: a button would turn the note into a call to action. */}
          {spendLimit === null ? (
            <Section className="my-4 text-center">
              <Button href={spendManagementHref}>
                Set up spend management
              </Button>
            </Section>
          ) : null}
          {isCombined ? null : (
            <Paragraph>
              You can check your current usage at any time in your{" "}
              {teamSettingsLink}.
            </Paragraph>
          )}
          <Paragraph>
            If you have any questions about your usage or your plan, reply to
            this email.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
