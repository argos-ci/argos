import { FetchResult, useMutation } from "@apollo/client";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from "lucide-react";
import {
  Disclosure,
  DisclosureContent,
  useDisclosureState,
} from "ariakit/disclosure";
import { clsx } from "clsx";
import moment from "moment";
import { ReactNode, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import config from "@/config";
import { TeamUpgradeDialogButton } from "@/containers/Team/UpgradeDialog";
import { FragmentType, graphql, useFragment } from "@/gql";
import {
  AccountSubscriptionProvider,
  AccountSubscriptionStatus,
  TrialStatus,
} from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardSeparator,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { ContactLink } from "@/ui/ContactLink";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogState,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Anchor, Link } from "@/ui/Link";
import { Progress } from "@/ui/Progress";
import { StripePortalLink } from "@/ui/StripeLink";
import { Time } from "@/ui/Time";

const now = new Date();
const FREE_PLAN_EXPIRATION_DATE = new Date("2023-06-01");

const TerminateTrialMutation = graphql(`
  mutation terminateTrial($accountId: ID!) {
    terminateTrial(accountId: $accountId) {
      id
      subscriptionStatus
      __typename
    }
  }
`);

const PlanCardFragment = graphql(`
  fragment PlanCard_Account on Account {
    id
    stripeCustomerId
    periodStartDate
    periodEndDate
    subscriptionStatus
    trialStatus
    hasForcedPlan
    pendingCancelAt
    paymentProvider

    plan {
      id
      name
      screenshotsLimitPerMonth
    }

    subscription {
      id
      paymentMethodFilled
    }

    projects(first: 100, after: 0) {
      edges {
        id
        name
        public
        currentMonthUsedScreenshots
      }
    }
  }
`);

type AccountFragment = FragmentType<typeof PlanCardFragment>;
type Project = {
  id: string;
  name: string;
  public: boolean;
  currentMonthUsedScreenshots: number;
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ConfirmTrialEndDialog = ({
  state,
  terminateTrial,
  loading,
  accountId,
}: {
  state: DialogState;
  terminateTrial: (props: {
    variables: any;
  }) => Promise<FetchResult<{ terminateTrial: any }>>;
  loading: boolean;
  accountId: string;
}) => {
  return (
    <Dialog
      state={state}
      style={{ width: 560 }}
      aria-label="Confirm early trial termination"
    >
      <DialogBody>
        <DialogTitle>Terminate Trial Early</DialogTitle>
        <DialogText>
          You are about to terminate your trial early. This will initiate your
          subscription and remove the screenshot usage limitation.{" "}
          <span className="font-semibold">
            Charges will be applied at the end of the billing period.
          </span>
        </DialogText>
        <DialogText>Do you want to continue?</DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          disabled={loading}
          onClick={async () => {
            await terminateTrial({
              variables: { accountId },
            });
            state.hide();
          }}
        >
          Terminate Trial
        </Button>
      </DialogFooter>
    </Dialog>
  );
};

const PricingLinks = () => {
  return (
    <Anchor href="https://argos-ci.com/pricing" external>
      Learn more
    </Anchor>
  );
};

const PlanStatus = ({
  subscriptionStatus,
  planName,
  trialStatus,
}: {
  subscriptionStatus: AccountSubscriptionStatus | null | undefined;
  planName: string;
  trialStatus: TrialStatus | null;
}) => {
  if (subscriptionStatus === null) {
    return (
      <>
        Your Personal account is on the{" "}
        <span className="font-medium">Hobby</span> plan. Free of charge.
      </>
    );
  }

  if (trialStatus === TrialStatus.Expired) {
    return (
      <>
        Your trial has expired.{" "}
        <Chip scale="sm" color="danger">
          Trial expired
        </Chip>{" "}
        <PricingLinks />
      </>
    );
  }

  switch (subscriptionStatus) {
    case AccountSubscriptionStatus.Missing:
      return (
        <>
          Your team has no paid plan. <PricingLinks />
        </>
      );

    case AccountSubscriptionStatus.Canceled:
      return (
        <>
          Your plan has been cancelled. <PricingLinks />
        </>
      );

    default:
      return (
        <>
          Your team is on the{" "}
          <span className="font-medium">{capitalize(planName)}</span> plan
          {subscriptionStatus === AccountSubscriptionStatus.Trialing && (
            <>
              {" "}
              <Chip scale="xs" color="info">
                Trial
              </Chip>
            </>
          )}
          .
        </>
      );
  }
};

const PlanStatusDescription = ({
  openTrialEndDialog,
  hasGitHubSubscription,
  account,
}: {
  openTrialEndDialog: () => void;
  hasGitHubSubscription: boolean;
  account: any;
}) => {
  const {
    subscriptionStatus,
    stripeCustomerId,
    trialStatus,
    hasForcedPlan,
    pendingCancelAt,
    subscription,
    periodEndDate,
  } = useFragment(PlanCardFragment, account);

  const missingPaymentMethod = Boolean(
    subscription && !subscription.paymentMethodFilled,
  );
  const formattedPeriodEndDate = moment(periodEndDate).format("LL");

  if (missingPaymentMethod && stripeCustomerId) {
    return (
      <Paragraph>
        Please{" "}
        <StripePortalLink
          stripeCustomerId={stripeCustomerId}
          accountId={account.id}
        >
          add a payment method
        </StripePortalLink>{" "}
        to retain access to team features after the trial ends on{" "}
        {formattedPeriodEndDate}.
      </Paragraph>
    );
  }

  switch (subscriptionStatus) {
    case AccountSubscriptionStatus.Trialing: {
      if (pendingCancelAt) {
        return (
          <Paragraph>
            Trial canceled. You can still use team features until the trial ends
            on {formattedPeriodEndDate}.
          </Paragraph>
        );
      }

      return (
        <>
          <Paragraph>
            Your subscription will automatically begin after the trial ends on{" "}
            {formattedPeriodEndDate}.
          </Paragraph>
          <Paragraph>
            To remove the screenshot limitation and enable usage-based pricing,
            you can{" "}
            <Anchor className="cursor-pointer" onClick={openTrialEndDialog}>
              terminate the trial early
            </Anchor>
            .
          </Paragraph>
        </>
      );
    }

    case AccountSubscriptionStatus.Active: {
      if (hasForcedPlan) {
        return (
          <Paragraph>
            You are on a specific plan that is not available for subscription.
            Contact our Sales team to learn more.
          </Paragraph>
        );
      }

      if (hasGitHubSubscription) {
        return (
          <Paragraph>
            You subscribed from GitHub Marketplace. You can upgrade or cancel
            your plan directly from{" "}
            <Anchor href="https://github.com/marketplace/argos-ci">
              GitHub
            </Anchor>
            .
          </Paragraph>
        );
      }

      return (
        <Paragraph>
          The next payment will occur on {formattedPeriodEndDate}.
        </Paragraph>
      );
    }

    case AccountSubscriptionStatus.Missing:
    case AccountSubscriptionStatus.Canceled: {
      return trialStatus === TrialStatus.Expired ? (
        <Paragraph>Subscribe to Pro plan to use team features.</Paragraph>
      ) : (
        <>
          <Paragraph>
            {now < FREE_PLAN_EXPIRATION_DATE
              ? "Starting June 1st, 2023, a Pro plan will be required to use team features."
              : "Subscribe to Pro plan to use team features."}
          </Paragraph>
          {hasGitHubSubscription && (
            <Paragraph>
              Note: To switch to a Stripe Plan, you must cancel your Github Free
              plan first. Your data will be preserved.
            </Paragraph>
          )}
        </>
      );
    }

    default:
      return null;
  }
};

const ConsumptionBlock = ({
  projects,
  screenshotsLimitPerMonth,
}: {
  projects: Project[];
  screenshotsLimitPerMonth: number;
}) => {
  const disclosure = useDisclosureState({ defaultOpen: false });
  const screenshotsSum = projects.reduce(
    (sum, project) => project.currentMonthUsedScreenshots + sum,
    0,
  );

  return (
    <div className="flex flex-col gap-2 rounded border p-4">
      <div className="font-medium">Projects</div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between font-medium">
          <div>
            {screenshotsSum.toLocaleString()}{" "}
            {screenshotsSum > 1 ? "screenshots" : "screenshot"}
          </div>
          <div className="text-low">
            / {screenshotsLimitPerMonth.toLocaleString()}
          </div>
        </div>
        <Progress
          value={screenshotsSum}
          max={screenshotsLimitPerMonth}
          min={0}
        />
      </div>

      <Disclosure
        state={disclosure}
        className={clsx(
          "text-sm text-low transition hover:text focus:outline-none",
          projects.length === 0 ? "hidden" : "",
        )}
      >
        {disclosure.open ? "Hide" : "Show"} usage detail{" "}
        {disclosure.open ? (
          <ChevronDownIcon className="inline h-[1em] w-[1em]" />
        ) : (
          <ChevronRightIcon className="inline h-[1em] w-[1em]" />
        )}
      </Disclosure>

      <DisclosureContent
        state={disclosure}
        as="ul"
        className="mt-2 text-sm text-low"
      >
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between border-b px-1 py-1 last:border-b-0"
          >
            <span>{project.name}</span>
            <span className="tabular-nums">
              {project.currentMonthUsedScreenshots.toLocaleString()}
            </span>
          </li>
        ))}
      </DisclosureContent>
    </div>
  );
};

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 text-low">{children}</p>
);

const ManageSubscriptionButton = ({
  stripeCustomerId,
  accountId,
  paymentProvider,
}: {
  accountId: string;
  stripeCustomerId: string | null;
  paymentProvider: AccountSubscriptionProvider | null;
}) => {
  if (paymentProvider === AccountSubscriptionProvider.Github) {
    return (
      <Anchor href={config.get("github.marketplaceUrl")} external>
        Manage your subscription
      </Anchor>
    );
  }

  if (
    paymentProvider === AccountSubscriptionProvider.Stripe &&
    stripeCustomerId
  ) {
    return (
      <StripePortalLink
        stripeCustomerId={stripeCustomerId}
        accountId={accountId}
      >
        Manage your subscription
      </StripePortalLink>
    );
  }

  return null;
};

function Period({ start, end }: { start: string; end: string }) {
  const sameYear = moment(start).isSame(end, "year");
  const format = sameYear ? "MMM DD" : "MMM DD YYYY";
  return (
    <div className="font-medium">
      Current period ({<Time date={start} format={format} />} -{" "}
      {<Time date={end} format={format} />})
    </div>
  );
}

export const PlanCard = (props: { account: AccountFragment }) => {
  const account = useFragment(PlanCardFragment, props.account);
  const {
    plan,
    projects,
    subscriptionStatus,
    stripeCustomerId,
    periodStartDate,
    periodEndDate,
    trialStatus,
    paymentProvider,
  } = account;

  const [showTrialEndDialog, setShowTrialEndDialog] = useState(false);
  const confirmTrialEndDialogState = useDialogState({
    open: showTrialEndDialog,
    setOpen: (open) => {
      if (!open) {
        setShowTrialEndDialog(false);
      }
    },
  });

  const ContactSalesLink = ({ isButton }: { isButton: boolean }) => {
    const contactHref = `mailto:${config.get("contactEmail")}`;
    return isButton ? (
      <Button color="neutral" variant="outline">
        {(buttonProps) => (
          <a href={contactHref} {...buttonProps}>
            Contact Sales
          </a>
        )}
      </Button>
    ) : (
      <Link to={contactHref}>Contact Sales</Link>
    );
  };

  const [terminateTrial, { loading: terminateTrialLoading }] = useMutation(
    TerminateTrialMutation,
    {
      optimisticResponse: (variables) => ({
        terminateTrial: {
          id: variables.accountId,
          subscriptionStatus: AccountSubscriptionStatus.Active,
          __typename: "Team" as const,
        },
      }),
    },
  );

  const isTeam = Boolean(account.subscriptionStatus);
  const showUpgradeButton =
    account.subscriptionStatus === AccountSubscriptionStatus.Canceled ||
    account.subscriptionStatus === AccountSubscriptionStatus.Missing;

  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <CardParagraph>
          <PlanStatus
            subscriptionStatus={subscriptionStatus}
            planName={plan?.name ?? ""}
            trialStatus={trialStatus ?? null}
          />
          <PlanStatusDescription
            openTrialEndDialog={() => setShowTrialEndDialog(true)}
            hasGitHubSubscription={
              paymentProvider === AccountSubscriptionProvider.Github
            }
            account={account}
          />
        </CardParagraph>

        {plan ? (
          <>
            <CardSeparator className="my-6" />
            <Period start={periodStartDate} end={periodEndDate} />
            <div className="mt-4">
              <ConsumptionBlock
                projects={projects.edges}
                screenshotsLimitPerMonth={plan.screenshotsLimitPerMonth}
              />
            </div>
          </>
        ) : null}
        {!isTeam && (
          <>
            <CardSeparator className="my-6" />
            <p className="my-4 text-sm text-low">
              Your plan includes a limited amount of screenshots. If the usage
              on your projects exceeds the allotted limit, you will need to
              upgrade to a Pro team.
            </p>
            <div className="border rounded p-2 mt-4 text-sm">
              To take advantage of collaboration, create a new Pro team and
              transfer your projects.
            </div>
          </>
        )}
      </CardBody>
      <CardFooter>
        {account.hasForcedPlan ? (
          <ContactLink />
        ) : (
          <div className="flex items-center justify-between gap-4 flex-row-reverse">
            {isTeam && showUpgradeButton && (
              <TeamUpgradeDialogButton initialAccountId={account.id} />
            )}
            {!isTeam && (
              <div className="flex items-center justify-between gap-4">
                Want to collaborate?
                <Button>
                  {(buttonProps) => (
                    <RouterLink to="/teams/new" {...buttonProps}>
                      <ButtonIcon>
                        <PlusCircleIcon />
                      </ButtonIcon>
                      Create a Team
                    </RouterLink>
                  )}
                </Button>
              </div>
            )}
            <ContactSalesLink isButton={!showUpgradeButton} />
            <ManageSubscriptionButton
              accountId={account.id}
              stripeCustomerId={stripeCustomerId ?? null}
              paymentProvider={paymentProvider ?? null}
            />
          </div>
        )}
      </CardFooter>
      {subscriptionStatus === AccountSubscriptionStatus.Trialing &&
        stripeCustomerId && (
          <ConfirmTrialEndDialog
            state={confirmTrialEndDialogState}
            loading={terminateTrialLoading}
            terminateTrial={terminateTrial}
            accountId={account.id}
          />
        )}
    </Card>
  );
};
