import { assertNever } from "@argos/util/assertNever";
import { Section } from "react-email";
import { z } from "zod";

import config from "@/config";
import {
  PlanLimitPlanKindSchema,
  PlanLimitThresholdSchema,
} from "@/database/services/plan-limit";

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

export const handler = defineNotificationHandler({
  type: "plan_limit",
  category: "billing",
  schema: z.object({
    threshold: PlanLimitThresholdSchema,
    planKind: PlanLimitPlanKindSchema,
    planName: z.string(),
    includedScreenshots: z.number(),
    periodEndDate: z.string(),
    accountType: z.enum(["team", "user"]),
    accountName: z.string().nullish(),
    accountSlug: z.string(),
  }),
  previewData: {
    threshold: 90,
    planKind: "github",
    planName: "Starter",
    includedScreenshots: 40000,
    periodEndDate: "2026-12-01T00:00:00.000Z",
    accountType: "team",
    accountName: "Argos",
    accountSlug: "argos",
  },
  email: (props) => {
    const { threshold, planKind, planName, accountType, ctx } = props;
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
    const resetDate = new Date(props.periodEndDate).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", timeZone: "UTC" },
    );

    const upgrade = (() => {
      switch (planKind) {
        case "github":
          return {
            paragraph: (
              <Paragraph>
                Your plan is billed through GitHub Marketplace, so you can
                upgrade it on GitHub from your{" "}
                <Link href={billingHref}>billing settings</Link>.
              </Paragraph>
            ),
            unblock: ", or as soon as you upgrade your plan",
            button: { label: "Upgrade plan", href: billingHref },
          };
        case "stripe":
          return {
            paragraph: (
              <Paragraph>
                You can upgrade your plan from your{" "}
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
      switch (threshold) {
        case 90: {
          return {
            subject:
              accountType === "team"
                ? `${accountName} has used 90% of its ${planName} plan`
                : `You have used 90% of your ${planName} plan`,
            preview: `Past 110% of the limit, new builds will be rejected until ${resetDate}.`,
            title: `Your ${planName} plan is at 90%`,
            intro: (
              <>
                <Paragraph>
                  {accountType === "team" ? (
                    <>
                      Your team, <strong>{accountName}</strong>, has used 90% of
                      the {included} included in its <strong>{planName}</strong>{" "}
                      plan this billing period.
                    </>
                  ) : (
                    <>
                      You have used 90% of the {included} included in your{" "}
                      <strong>{planName}</strong> plan this billing period.
                    </>
                  )}
                </Paragraph>
                <Paragraph>
                  Argos keeps accepting builds for now, but{" "}
                  <strong>
                    once usage goes past 110% of the limit, new builds will be
                    rejected
                  </strong>{" "}
                  until the period resets on <strong>{resetDate}</strong>.
                </Paragraph>
              </>
            ),
          };
        }
        case 110: {
          return {
            subject:
              accountType === "team"
                ? `Argos is now rejecting new builds for ${accountName}`
                : "Argos is now rejecting your new builds",
            preview: `Builds will be accepted again on ${resetDate}, when the period resets.`,
            title: "New builds are being rejected",
            intro: (
              <>
                <Paragraph>
                  {accountType === "team" ? (
                    <>
                      Your team, <strong>{accountName}</strong>, has gone past
                      110% of the {included} included in its{" "}
                      <strong>{planName}</strong> plan this billing period, so{" "}
                      <strong>Argos now rejects its new builds</strong>.
                    </>
                  ) : (
                    <>
                      You have gone past 110% of the {included} included in your{" "}
                      <strong>{planName}</strong> plan this billing period, so{" "}
                      <strong>Argos now rejects your new builds</strong>.
                    </>
                  )}
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
          assertNever(threshold);
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
