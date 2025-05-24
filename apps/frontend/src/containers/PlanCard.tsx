import { ReactNode } from "react";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { PlusCircleIcon } from "lucide-react";
import moment from "moment";

import { config } from "@/config";
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

const contactHref = `mailto:${config.contactEmail}`;

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
      paymentMethodFilled
      trialDaysRemaining
      endDate
      provider
    }

    projects(first: 100, after: 0) {
      edges {
        id
        name
        public
        currentPeriodScreenshots
      }
    }
    ...AccountPlanChip_Account
  }
`);

type Project = {
  id: string;
  name: string;
  public: boolean;
  currentPeriodScreenshots: number;
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
    case AccountSubscriptionStatus.Trialing: {
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
              <Time date={account.subscription.endDate} format="LL" />
            </strong>
            .
          </CardParagraph>
        );
      }
      const daysRemaining = account.subscription.trialDaysRemaining;
      return (
        <>
          <CardParagraph>
            Your team is on the <AccountPlanChip account={props.account} />{" "}
            plan.
          </CardParagraph>
          <CardParagraph>
            {daysRemaining === 1 ? (
              <>
                <strong>Your trial ends today.</strong>{" "}
              </>
            ) : daysRemaining ? (
              <>
                <strong>Your trial ends in {daysRemaining} days.</strong>{" "}
              </>
            ) : null}
            <StripePortalLink
              stripeCustomerId={account.stripeCustomerId}
              accountId={account.id}
            >
              Add a payment method
            </StripePortalLink>{" "}
            to retain access to team features.
          </CardParagraph>
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
            return (
              <CardParagraph className="text-low">
                The next payment will occur on{" "}
                {moment(account.periodEndDate).format("LL")}.
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
  }
  return (
    <CardParagraph>
      No active plan. Subscribe to Pro plan to use Team features.
    </CardParagraph>
  );
}

function ConsumptionBlock({
  projects,
  includedScreenshots,
}: {
  projects: Project[];
  includedScreenshots: number;
}) {
  const screenshotsSum = projects.reduce(
    (sum, project) => project.currentPeriodScreenshots + sum,
    0,
  );

  return (
    <div className="flex flex-col gap-2 rounded-sm border p-4">
      <div className="font-medium">Projects</div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between font-medium">
          <div>
            {screenshotsSum.toLocaleString()}{" "}
            {screenshotsSum > 1 ? "screenshots" : "screenshot"}
          </div>
          <div className="text-low">
            / {includedScreenshots.toLocaleString()}
          </div>
        </div>
        <Progress
          value={screenshotsSum}
          max={includedScreenshots}
          min={0}
          className="w-full"
        />
      </div>

      {projects.length > 0 && (
        <Details className="text-sm">
          <Summary>Show usage detail</Summary>
          <ul className="text-low">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between border-b p-1 last:border-b-0"
              >
                <span>{project.name}</span>
                <span className="tabular-nums">
                  {project.currentPeriodScreenshots.toLocaleString()}
                </span>
              </li>
            ))}
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
        return <LinkButton href={contactHref}>{children}</LinkButton>;
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
      return <LinkButton href={contactHref}>{children}</LinkButton>;
    }
    default:
      assertNever(provider);
  }
}

function Period({ start, end }: { start: string; end: string }) {
  const sameYear = moment(start).isSame(end, "year");
  const format = sameYear ? "MMM DD" : "MMM D, YYYY";
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
        Contact Argos support on{" "}
        <Link href="https://argos-ci.com/discord" target="_blank">
          Discord
        </Link>{" "}
        or{" "}
        <Link href={contactHref} target="_blank">
          by email
        </Link>
        {"  "}to manage your subscription.
      </CardFooter>
    );
  }
  switch (account.__typename) {
    case "User": {
      return (
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            Custom needs?{" "}
            <Link href={contactHref} target="_blank">
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
                <Link href={contactHref} target="_blank">
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
                  href={contactHref}
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

  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <PlanStatus account={account} />
        {plan && (
          <>
            <CardSeparator className="my-6" />
            <Period start={periodStartDate} end={periodEndDate} />
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
            <div className="mt-4 rounded-sm border p-2 text-sm">
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
