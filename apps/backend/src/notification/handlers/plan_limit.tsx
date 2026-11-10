import { PLAN_LIMIT_WARNING_RATIO } from "@argos/schemas/plan-limit";
import { assertNever } from "@argos/util/assertNever";
import { formatDate } from "@argos/util/date-format";
import { Section } from "react-email";
import { z } from "zod";

import config from "@/config";
import { FLAT_RATE_MAX_CONSUMPTION_RATIO } from "@/database/models";
import { PlanLimitAlertSchema } from "@/database/services/plan-limit-alert";

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

const contactHref = "https://argos-ci.com/contact";

const upgradeHobbyDocsHref =
  "https://argos-ci.com/docs/learn/billing-and-subscription/how-to-subscribe#upgrade-a-hobby-account-to-a-pro-team";

const percentFormat = new Intl.NumberFormat("en-US", { style: "percent" });

export const handler = defineNotificationHandler({
  type: "plan_limit",
  category: "billing",
  schema: PlanLimitAlertSchema.extend({
    accountType: z.enum(["team", "user"]),
    accountName: z.string().nullish(),
    accountSlug: z.string(),
  }),
  previewData: {
    level: "warning",
    planKind: "github",
    planName: "Starter",
    includedScreenshots: 40000,
    periodEndDate: "2026-12-01T00:00:00.000Z",
    accountType: "team",
    accountName: "Argos",
    accountSlug: "argos",
  },
  email: (props) => {
    const { level, planKind, planName, accountType, ctx } = props;
    // Read at render time: the models import the handlers, so this module can
    // load before `Account` and its ratio are defined.
    const warningPercent = percentFormat.format(PLAN_LIMIT_WARNING_RATIO);
    const rejectionPercent = percentFormat.format(
      FLAT_RATE_MAX_CONSUMPTION_RATIO,
    );
    const accountName = props.accountName || props.accountSlug;
    const billingHref = new URL(
      `/${props.accountSlug}/settings/billing`,
      baseUrl,
    ).href;
    const included = (
      <strong>
        {props.includedScreenshots.toLocaleString("en-US")} screenshots
      </strong>
    );
    const resetDate = formatDate(new Date(props.periodEndDate), "longMonthDay");
    const isTeam = accountType === "team";
    const accountHas = isTeam ? (
      <>
        Your team, <strong>{accountName}</strong>, has
      </>
    ) : (
      "You have"
    );
    const its = isTeam ? "its" : "your";

    const upgrade = (() => {
      switch (planKind) {
        case "github":
        case "stripe":
          return {
            paragraph: (
              <Paragraph>
                {planKind === "github"
                  ? "Your plan is billed through GitHub Marketplace, so you can upgrade it on GitHub from your"
                  : "You can upgrade your plan from your"}{" "}
                <Link href={billingHref}>billing settings</Link>.
              </Paragraph>
            ),
            unblock: ", or as soon as you upgrade your plan",
            button: { label: "Upgrade plan", href: billingHref },
          };
        case "hobby":
          return {
            paragraph: (
              <Paragraph>
                The Hobby plan has a fixed screenshot limit, and paid plans
                belong to teams, not to personal accounts. To get more
                screenshots,{" "}
                <strong>
                  create a team on the Pro plan, then transfer your projects to
                  it
                </strong>{" "}
                from each project’s settings (
                <Link href={upgradeHobbyDocsHref}>this guide</Link> walks you
                through both steps). Your first team starts with a 14-day Pro
                trial, no credit card required.
              </Paragraph>
            ),
            unblock:
              ". The builds of a project you transfer to a team on the Pro plan are accepted right away",
            button: {
              label: "Create a team",
              href: new URL("/teams/new", baseUrl).href,
            },
          };
        case "forced":
          return {
            paragraph: (
              <Paragraph>
                Your plan was set up by the Argos team, so{" "}
                <Link href={contactHref}>contact us</Link> to change it.
              </Paragraph>
            ),
            unblock: ", or as soon as your plan is changed",
            button: { label: "Review usage", href: billingHref },
          };
        default:
          assertNever(planKind);
      }
    })();

    const content = (() => {
      switch (level) {
        case "warning": {
          return {
            subject: `${isTeam ? `${accountName} has` : "You have"} used ${warningPercent} of ${its} ${planName} plan`,
            preview: `Past ${rejectionPercent} of the limit, new builds will be rejected until ${resetDate}.`,
            title: `Your ${planName} plan is at ${warningPercent}`,
            intro: (
              <>
                <Paragraph>
                  {accountHas} used {warningPercent} of the {included} included
                  in {its} <strong>{planName}</strong> plan this billing period.
                </Paragraph>
                <Paragraph>
                  Argos keeps accepting builds for now, but{" "}
                  <strong>
                    once usage goes past {rejectionPercent} of the limit, new
                    builds will be rejected
                  </strong>{" "}
                  until the period resets on <strong>{resetDate}</strong>.
                </Paragraph>
              </>
            ),
          };
        }
        case "rejected": {
          return {
            subject: isTeam
              ? `Argos is now rejecting new builds for ${accountName}`
              : "Argos is now rejecting your new builds",
            preview: `Builds will be accepted again on ${resetDate}, when the period resets.`,
            title: "New builds are being rejected",
            intro: (
              <>
                <Paragraph>
                  {accountHas} gone past {rejectionPercent} of the {included}{" "}
                  included in {its} <strong>{planName}</strong> plan this
                  billing period, so{" "}
                  <strong>Argos now rejects {its} new builds</strong>.
                </Paragraph>
                <Paragraph>
                  Builds will be accepted again on <strong>{resetDate}</strong>,
                  when the period resets{upgrade.unblock}.
                </Paragraph>
              </>
            ),
          };
        }
        default:
          assertNever(level);
      }
    })();

    return {
      subject: content.subject,
      body: (
        <EmailLayout
          preview={content.preview}
          preferencesUrl={ctx.preferencesUrl}
        >
          <H1>{content.title}</H1>
          <Hi name={ctx.user.name} />
          {content.intro}
          {upgrade.paragraph}
          <Section className="my-4 text-center">
            <Button href={upgrade.button.href}>{upgrade.button.label}</Button>
          </Section>
          <Paragraph>
            If you have any questions about your usage or your plan, don’t
            hesitate to reach out.
          </Paragraph>
          <Signature />
        </EmailLayout>
      ),
    };
  },
});
