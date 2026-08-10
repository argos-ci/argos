import { ReactNode } from "react";
import { assertNever } from "@argos/util/assertNever";
import { isSameYear } from "@argos/util/date";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import { PlusCircleIcon } from "lucide-react";

import { config } from "@/config";
import { CONTACT_HREF } from "@/constants";
import { TeamSubscribeDialog } from "@/containers/Team/SubscribeDialog";
import { DocumentType, graphql } from "@/gql";
import {
  AccountSubscriptionProvider,
  AccountSubscriptionStatus,
} from "@/gql/graphql";
import { ButtonIcon, LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardSeparator,
  CardTitle,
} from "@/ui/Card";
import { Details, Summary } from "@/ui/Details";
import { Link } from "@/ui/Link";
import { Progress } from "@/ui/Progress";
import { StripePortalLink } from "@/ui/StripeLink";
import { Time } from "@/ui/Time";

import { AccountPlanChip } from "./AccountPlanChip";

const _PlanCardFragment = graphql(`
  fragment PlanCard_Account on Account {
    __typename
    id
    stripeCustomerId
    periodStartDate
    periodEndDate
    subscriptionStatus
    hasForcedPlan
    includedScreenshots

    plan {
      id
      displayName
    }

    subscription {
      id
      trialDaysRemaining
      endDate
      provider
    }

    projects(first: 100, after: 0) {
      edges {
        id
        name
        public
        currentPeriodScreenshots {
          all
          neutral
          storybook
          media {
            count
            units
          }
        }
      }
    }
    ...AccountPlanChip_Account
  }
`);

type ScreenshotsCount = {
  all: number;
  neutral: number;
  storybook: number;
  media: {
    count: number;
    units: number;
  };
};

type Project = {
  id: string;
  name: string;
  public: boolean;
  currentPeriodScreenshots: ScreenshotsCount;
};

function PlanStatus(props: {
  account: DocumentType<typeof _PlanCardFragment>;
}) {
  const { account } = props;

  switch (account.subscriptionStatus) {
    case AccountSubscriptionStatus.TrialExpired: {
      return (
        <CardParagraph>
          Your trial has expired. Subscribe to Pro plan to use Team features.
        </CardParagraph>
      );
    }
    case AccountSubscriptionStatus.Trialing:
    case AccountSubscriptionStatus.TrialingWithPaymentMethod: {
      invariant(
        account.subscription,
        "If trialing, subscription must be defined",
      );
      invariant(
        account.stripeCustomerId,
        "Stripe customer ID must be defined if trialing",
      );
      if (account.subscription.endDate) {
        return (
          <CardParagraph>
            Your trial has been canceled. You can still use team features until{" "}
            <strong>
              <Time date={account.subscription.endDate} format="longDate" />
            </strong>
            .
          </CardParagraph>
        );
      }
      const carded =
        account.subscriptionStatus ===
        AccountSubscriptionStatus.TrialingWithPaymentMethod;
      const daysRemaining = account.subscription.trialDaysRemaining;
      // Null once the trial end date is passed and Stripe has not synced the
      // new status back yet.
      const countdown =
        daysRemaining === 1
          ? "Your trial ends today."
          : daysRemaining
            ? `Your trial ends in ${daysRemaining} days.`
            : null;
      return (
        <>
          <CardParagraph>
            Your team is on the <AccountPlanChip account={props.account} />{" "}
            plan.
          </CardParagraph>
          {/* A carded trial with no countdown left has nothing to say: it
              needs no action, and there is no date to announce. */}
          {(countdown || !carded) && (
            <CardParagraph>
              {countdown ? <strong>{countdown}</strong> : null}
              {!carded && (
                <>
                  {countdown ? " " : null}
                  <StripePortalLink
                    stripeCustomerId={account.stripeCustomerId}
                    accountId={account.id}
                  >
                    Add a payment method
                  </StripePortalLink>{" "}
                  to retain access to team features.
                </>
              )}
            </CardParagraph>
          )}
        </>
      );
    }
    case AccountSubscriptionStatus.Active:
    case AccountSubscriptionStatus.PastDue: {
      return (
        <>
          <CardParagraph>
            Your team is on the <AccountPlanChip account={props.account} />{" "}
            plan.
          </CardParagraph>
          {(() => {
            if (account.hasForcedPlan) {
              return (
                <CardParagraph className="text-low">
                  You are on a specific plan that is not available for
                  subscription. Contact our Sales team to learn more.
                </CardParagraph>
              );
            }
            if (
              account.subscription?.provider ===
              AccountSubscriptionProvider.Github
            ) {
              return (
                <CardParagraph className="text-low">
                  You subscribed from GitHub Marketplace. You can upgrade or
                  cancel your plan directly from{" "}
                  <Link
                    href="https://github.com/marketplace/argos-ci"
                    target="_blank"
                  >
                    GitHub
                  </Link>
                  .
                </CardParagraph>
              );
            }
            if (!account.periodEndDate) {
              return null;
            }
            return (
              <CardParagraph className="text-low">
                The next payment will occur on{" "}
                {formatDate(new Date(account.periodEndDate), "longDate")}.
              </CardParagraph>
            );
          })()}
        </>
      );
    }
    case null: {
      return (
        <CardParagraph>
          Your Personal account is on the{" "}
          <AccountPlanChip account={props.account} /> plan. Free of charge.
        </CardParagraph>
      );
    }
    case AccountSubscriptionStatus.Canceled:
    case AccountSubscriptionStatus.Unpaid:
    case AccountSubscriptionStatus.Incomplete:
    case AccountSubscriptionStatus.IncompleteExpired:
    case AccountSubscriptionStatus.Paused: {
      return (
        <CardParagraph>
          No active plan. Subscribe to Pro plan to use Team features.
        </CardParagraph>
      );
    }
    default:
      assertNever(account.subscriptionStatus);
  }
}

/**
 * What a screenshot total is made of, when it is made of more than one thing.
 *
 * Storybook screenshots and standalone media ride the same meter as classic
 * screenshots but at their own rates — one media upload is 1 unit for an image
 * and 25 for a video — so a total that moved says nothing on its own about what
 * moved it. Media reports both numbers because they answer different questions:
 * the units are what got billed, the count is what the account actually did.
 *
 * The parts add up to the total, which is why media units come back out of the
 * classic figure: they are folded into `neutral` on the way in.
 */
function UsageBreakdown({ screenshots }: { screenshots: ScreenshotsCount }) {
  const { storybook, media } = screenshots;

  if (storybook === 0 && media.count === 0) {
    return null;
  }

  const classic = screenshots.neutral - media.units;
  const parts = [
    storybook > 0 ? `${storybook.toLocaleString()} Storybook` : null,
    classic > 0 ? `${classic.toLocaleString()} classic` : null,
    media.count > 0
      ? `${media.units.toLocaleString()} from ${media.count.toLocaleString()} ${
          media.count > 1 ? "media" : "media upload"
        }`
      : null,
  ].filter(Boolean);

  return (
    <span className="text-low ml-4 text-sm font-normal">
      ({parts.join(" + ")})
    </span>
  );
}

/** "1,234 screenshots", with the breakdown when there is one to give. */
function UsageCount({ screenshots }: { screenshots: ScreenshotsCount }) {
  return (
    <>
      {screenshots.all.toLocaleString()}{" "}
      {screenshots.all > 1 ? "screenshots" : "screenshot"}{" "}
      <UsageBreakdown screenshots={screenshots} />
    </>
  );
}

function ConsumptionBlock({
  projects,
  includedScreenshots,
}: {
  projects: Project[];
  includedScreenshots: number;
}) {
  const screenshotsSum = projects.reduce<ScreenshotsCount>(
    (sum, project) => {
      const s = project.currentPeriodScreenshots;
      return {
        all: sum.all + s.all,
        neutral: sum.neutral + s.neutral,
        storybook: sum.storybook + s.storybook,
        media: {
          count: sum.media.count + s.media.count,
          units: sum.media.units + s.media.units,
        },
      };
    },
    { all: 0, neutral: 0, storybook: 0, media: { count: 0, units: 0 } },
  );

  return (
    <div className="border-thin flex flex-col gap-2 rounded-lg p-4">
      <div className="font-medium">Projects</div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between font-medium">
          <div>
            <UsageCount screenshots={screenshotsSum} />
          </div>
          <div className="text-low">
            / {includedScreenshots.toLocaleString()}
          </div>
        </div>
        <Progress
          value={screenshotsSum.all}
          max={includedScreenshots}
          min={0}
          className="w-full"
        />
      </div>

      {projects.length > 0 && (
        <Details className="text-sm">
          <Summary>Show usage detail</Summary>
          <ul className="text-low">
            {projects.map((project) => {
              const screenshots = project.currentPeriodScreenshots;
              const plain =
                screenshots.storybook === 0 && screenshots.media.count === 0;
              return (
                <li
                  key={project.id}
                  className="flex items-center justify-between border-b p-1 last:border-b-0"
                >
                  <span>{project.name}</span>
                  <span className={plain ? "tabular-nums" : undefined}>
                    <UsageCount screenshots={screenshots} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Details>
      )}
    </div>
  );
}

function ManageSubscriptionButton({
  account,
  children = "Manage your subscription",
}: {
  account: DocumentType<typeof _PlanCardFragment>;
  children: ReactNode;
}) {
  const provider = account.subscription?.provider ?? null;
  switch (provider) {
    case AccountSubscriptionProvider.Github:
      return (
        <Link href={config.github.marketplaceUrl} target="_blank">
          {children}
        </Link>
      );
    case AccountSubscriptionProvider.Stripe: {
      if (!account.stripeCustomerId) {
        return (
          <LinkButton href={CONTACT_HREF} target="_blank">
            {children}
          </LinkButton>
        );
      }
      return (
        <StripePortalLink
          stripeCustomerId={account.stripeCustomerId}
          accountId={account.id}
        >
          {children}
        </StripePortalLink>
      );
    }
    case null: {
      return (
        <LinkButton href={CONTACT_HREF} target="_blank">
          {children}
        </LinkButton>
      );
    }
    default:
      assertNever(provider);
  }
}

function Period({ start, end }: { start: string; end: string }) {
  const sameYear = isSameYear(new Date(start), new Date(end));
  const format = sameYear ? "monthDay" : "date";
  return (
    <div className="font-medium">
      Current period ({<Time date={start} format={format} />} -{" "}
      {<Time date={end} format={format} />})
    </div>
  );
}

function PlanCardFooter(props: {
  account: DocumentType<typeof _PlanCardFragment>;
}) {
  const { account } = props;
  if (account.hasForcedPlan) {
    return (
      <CardFooter>
        <Link href={CONTACT_HREF} target="_blank">
          Contact Argos support
        </Link>{" "}
        to manage your subscription.
      </CardFooter>
    );
  }
  switch (account.__typename) {
    case "User": {
      return (
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            Custom needs?{" "}
            <Link href={CONTACT_HREF} target="_blank">
              Contact Sales
            </Link>
          </div>
          <div className="flex items-center gap-4">
            Want to collaborate?
            <LinkButton href="/teams/new">
              <ButtonIcon>
                <PlusCircleIcon />
              </ButtonIcon>
              Create a Team
            </LinkButton>
          </div>
        </CardFooter>
      );
    }
    case "Team": {
      switch (account.subscriptionStatus) {
        case AccountSubscriptionStatus.Canceled: {
          return (
            <CardFooter className="flex items-center justify-between gap-4">
              <div>
                Custom needs?{" "}
                <Link href={CONTACT_HREF} target="_blank">
                  Contact Sales
                </Link>
              </div>
              <TeamSubscribeDialog initialAccountId={account.id}>
                Subscribe
              </TeamSubscribeDialog>
            </CardFooter>
          );
        }
        default: {
          return (
            <CardFooter className="flex items-center justify-between gap-4">
              <ManageSubscriptionButton account={account}>
                Manage subscription
              </ManageSubscriptionButton>
              <div className="flex items-center gap-4">
                Custom needs?{" "}
                <LinkButton
                  variant="secondary"
                  target="_blank"
                  href={CONTACT_HREF}
                >
                  Contact Sales
                </LinkButton>
              </div>
            </CardFooter>
          );
        }
      }
    }
    default:
      assertNever(account);
  }
}

export function PlanCard(props: {
  account: DocumentType<typeof _PlanCardFragment>;
}) {
  const { account } = props;
  const { plan, projects, periodStartDate, periodEndDate } = account;
  const hasPeriod = periodStartDate && periodEndDate;

  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <PlanStatus account={account} />
        {plan && (
          <>
            <CardSeparator className="my-6" />
            {hasPeriod && (
              <Period start={periodStartDate} end={periodEndDate} />
            )}
            <div className="mt-4">
              <ConsumptionBlock
                projects={projects.edges}
                includedScreenshots={account.includedScreenshots}
              />
            </div>
          </>
        )}
        {account.__typename === "User" && (
          <>
            <p className="text-low my-4 text-sm">
              Your plan has a specific limit on screenshots. If you exceed this
              limit in your projects, upgrading to a Team is required.
            </p>
            <div className="border-thin mt-4 rounded-lg p-2 text-sm">
              To take advantage of collaboration, create a Team and transfer
              your projects.
            </div>
          </>
        )}
      </CardBody>
      <PlanCardFooter account={account} />
    </Card>
  );
}
