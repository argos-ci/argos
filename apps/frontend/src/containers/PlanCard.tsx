import { ReactNode } from "react";
import { checkIsTrialingSubscriptionStatus } from "@argos/schemas/subscription-status";
import { assertNever } from "@argos/util/assertNever";
import { isSameYear } from "@argos/util/date";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { PlusCircleIcon } from "lucide-react";

import { config } from "@/config";
import { CONTACT_HREF } from "@/constants";
import {
  CancelSubscriptionDialog,
  getCancelledNoun,
  ResumeSubscriptionButton,
  type CancelledPeriod,
} from "@/containers/Team/CancelSubscription";
import { TeamSubscribeDialog } from "@/containers/Team/SubscribeDialog";
import { DocumentType, graphql } from "@/gql";
import {
  AccountSubscriptionProvider,
  AccountSubscriptionStatus,
} from "@/gql/graphql";
import { ButtonIcon, LinkButton, type ButtonVariant } from "@/ui/Button";
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
                  Add a payment method to retain access to team features.
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
            // A scheduled cancellation keeps every feature until the date it
            // lands on, so the card announces that date rather than a payment
            // that will never be taken.
            if (account.subscription?.endDate) {
              return (
                <CardParagraph className="text-low">
                  Your subscription is canceled. Your team keeps its plan until{" "}
                  <strong>
                    <Time
                      date={account.subscription.endDate}
                      format="longDate"
                    />
                  </strong>
                  .
                </CardParagraph>
              );
            }
            if (
              account.subscriptionStatus === AccountSubscriptionStatus.PastDue
            ) {
              return (
                <CardParagraph className="text-low">
                  The latest payment failed. Update your payment method to keep
                  team features.
                </CardParagraph>
              );
            }
            if (!account.periodEndDate) {
              return null;
            }
            return (
              <CardParagraph className="text-low">
                The next payment will occur on{" "}
                <Time date={account.periodEndDate} format="longDate" />.
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
    case AccountSubscriptionStatus.Unpaid: {
      return (
        <CardParagraph>
          Your subscription is unpaid. Proceed to payment to use team features
          again.
        </CardParagraph>
      );
    }
    case AccountSubscriptionStatus.Canceled:
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
function UsageBreakdown({
  screenshots,
  className,
}: {
  screenshots: ScreenshotsCount;
  className?: string;
}) {
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
    <span className={clsx("text-low text-sm font-normal", className)}>
      ({parts.join(" + ")})
    </span>
  );
}

function UsageTotal({ count }: { count: number }) {
  return (
    <>
      {count.toLocaleString()} {count > 1 ? "screenshots" : "screenshot"}
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
        <div className="flex flex-wrap items-baseline gap-x-4 font-medium">
          <div>
            <UsageTotal count={screenshotsSum.all} />
          </div>
          {/* Under the total and the limit until the settings sidebar leaves
              room beside them: squeezed in between, it breaks all three. */}
          <UsageBreakdown
            screenshots={screenshotsSum}
            className="max-lg:order-last max-lg:basis-full lg:flex-1"
          />
          <div className="text-low ml-auto whitespace-nowrap">
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
                  className="flex flex-wrap items-baseline gap-x-4 border-b p-1 last:border-b-0"
                >
                  <span className="flex-1">{project.name}</span>
                  <span className={plain ? "tabular-nums" : undefined}>
                    <UsageTotal count={screenshots.all} />
                  </span>
                  <UsageBreakdown screenshots={screenshots} />
                </li>
              );
            })}
          </ul>
        </Details>
      )}
    </div>
  );
}

/**
 * The one thing the plan asks of the team in its current state, if anything.
 *
 * Cancelling is not one of them: it has a card of its own at the bottom of
 * Billing, `PlanCancellationCard`.
 */
function PlanAction(props: {
  account: DocumentType<typeof _PlanCardFragment>;
}) {
  const { account } = props;

  if (account.subscription?.provider === AccountSubscriptionProvider.Github) {
    return (
      <LinkButton
        variant="secondary"
        href={config.github.marketplaceUrl}
        target="_blank"
      >
        Manage on GitHub
      </LinkButton>
    );
  }

  const portal = (label: ReactNode, variant: ButtonVariant) =>
    account.stripeCustomerId ? (
      <StripePortalLink
        stripeCustomerId={account.stripeCustomerId}
        accountId={account.id}
        asButton
        variant={variant}
      >
        {label}
      </StripePortalLink>
    ) : null;

  switch (account.subscriptionStatus) {
    case AccountSubscriptionStatus.Canceled:
    case AccountSubscriptionStatus.TrialExpired:
      return (
        <TeamSubscribeDialog initialAccountId={account.id}>
          Subscribe
        </TeamSubscribeDialog>
      );
    case AccountSubscriptionStatus.Trialing:
      return portal("Add payment method", "primary");
    case AccountSubscriptionStatus.PastDue:
      return portal("Update payment method", "primary");
    case AccountSubscriptionStatus.Unpaid:
      return portal("Proceed to payment", "primary");
    case AccountSubscriptionStatus.TrialingWithPaymentMethod:
    case AccountSubscriptionStatus.Active:
    case AccountSubscriptionStatus.Incomplete:
    case AccountSubscriptionStatus.IncompleteExpired:
    case AccountSubscriptionStatus.Paused:
      return portal("Payment and billing details", "secondary");
    case null:
      return null;
    default:
      assertNever(account.subscriptionStatus);
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

const CANCEL_SENTENCES: Record<CancelledPeriod, string> = {
  trial:
    "If you cancel, the trial does not turn into a paid plan, and your team keeps every Pro feature until it ends",
  paid: "If you cancel, your team keeps every Pro feature until the end of the period you have already paid for",
  unpaid:
    "If you cancel, your team keeps every Pro feature until the end of the current billing period",
};

/**
 * Cancelling sits at the bottom of Billing, away from the plan's everyday
 * actions, and the same card is the way back once a cancellation is scheduled.
 *
 * Only Stripe subscriptions get it: a GitHub Marketplace plan is canceled on
 * GitHub, a forced plan through us, and a trial with no card ends on its own.
 */
export function PlanCancellationCard(props: {
  account: DocumentType<typeof _PlanCardFragment>;
}) {
  const { account } = props;
  const { subscription } = account;

  if (
    account.hasForcedPlan ||
    subscription?.provider !== AccountSubscriptionProvider.Stripe
  ) {
    return null;
  }

  const trialing = checkIsTrialingSubscriptionStatus(
    account.subscriptionStatus,
  );

  // The plan card already gives the date it ends on, so this card only offers
  // the way back.
  if (subscription.endDate) {
    return (
      <Card>
        <CardBody>
          <CardTitle>{trialing ? "Trial" : "Subscription"} canceled</CardTitle>
          <CardParagraph>
            {trialing
              ? "The trial will not turn into a paid plan. Resume it to keep the plan after the trial."
              : "Your subscription will not renew. Resume it to keep the plan."}
          </CardParagraph>
        </CardBody>
        <CardFooter className="flex items-center justify-end">
          <ResumeSubscriptionButton accountId={account.id}>
            Resume {trialing ? "trial" : "subscription"}
          </ResumeSubscriptionButton>
        </CardFooter>
      </Card>
    );
  }

  if (account.subscriptionStatus === AccountSubscriptionStatus.Trialing) {
    return null;
  }

  const period = ((): CancelledPeriod => {
    switch (account.subscriptionStatus) {
      case AccountSubscriptionStatus.TrialingWithPaymentMethod:
        return "trial";
      case AccountSubscriptionStatus.PastDue:
        return "unpaid";
      default:
        return "paid";
    }
  })();

  return (
    <Card intent="danger">
      <CardBody>
        <CardTitle>Cancel {getCancelledNoun(period)}</CardTitle>
        <CardParagraph>
          {CANCEL_SENTENCES[period]}
          {account.periodEndDate ? (
            <>
              , on{" "}
              <strong>
                <Time date={account.periodEndDate} format="longDate" />
              </strong>
            </>
          ) : null}
          .
        </CardParagraph>
      </CardBody>
      <CardFooter className="flex items-center justify-end">
        <CancelSubscriptionDialog
          accountId={account.id}
          periodEndDate={account.periodEndDate ?? null}
          period={period}
        />
      </CardFooter>
    </Card>
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
      return (
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            Custom needs?{" "}
            <Link href={CONTACT_HREF} target="_blank">
              Contact Sales
            </Link>
          </div>
          {/* Under the note on a phone, the action stays on the left, where
              `CardFooter` would push it right. */}
          <div className="max-md:ml-0!">
            <PlanAction account={account} />
          </div>
        </CardFooter>
      );
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
