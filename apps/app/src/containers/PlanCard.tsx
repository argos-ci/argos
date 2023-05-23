import { FetchResult, useMutation } from "@apollo/client";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, ChevronRightIcon } from "@primer/octicons-react";
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
import { FragmentType, graphql, useFragment } from "@/gql";
import { PurchaseSource, PurchaseStatus, TrialStatus } from "@/gql/graphql";
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
import { Anchor } from "@/ui/Link";
import { Progress } from "@/ui/Progress";
import { StripePortalLink } from "@/ui/StripeLink";
import { Time } from "@/ui/Time";

import { UpgradeDialogButton } from "./UpgradeDialog";

const now = new Date();
const FREE_PLAN_EXPIRATION_DATE = new Date("2023-06-01");

const TerminateTrialMutation = graphql(`
  mutation terminateTrial($accountId: ID!) {
    terminateTrial(accountId: $accountId) {
      id
      purchaseStatus
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
    purchaseStatus
    trialStatus
    hasForcedPlan
    pendingCancelAt
    paymentProvider

    plan {
      id
      name
      screenshotsLimitPerMonth
      usageBased
    }

    purchase {
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
      <DialogBody confirm>
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
  purchaseStatus,
  planName,
  trialStatus,
}: {
  purchaseStatus: PurchaseStatus | null | undefined;
  planName: string;
  trialStatus: TrialStatus | null;
}) => {
  if (purchaseStatus === null) {
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

  switch (purchaseStatus) {
    case PurchaseStatus.Missing:
      return (
        <>
          Your team has no paid plan. <PricingLinks />
        </>
      );

    case PurchaseStatus.Canceled:
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
          {purchaseStatus === PurchaseStatus.Trialing && (
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
  hasGithubPurchase,
  account,
}: {
  openTrialEndDialog: () => void;
  hasGithubPurchase: boolean;
  account: any;
}) => {
  const {
    purchaseStatus,
    stripeCustomerId,
    trialStatus,
    hasForcedPlan,
    pendingCancelAt,
    purchase,
    periodEndDate,
  } = useFragment(PlanCardFragment, account);

  const missingPaymentMethod = Boolean(
    purchase && !purchase.paymentMethodFilled
  );
  const formattedPeriodEndDate = moment(periodEndDate).format("LL");

  if (missingPaymentMethod) {
    return (
      <Paragraph>
        Please{" "}
        <StripePortalLink stripeCustomerId={stripeCustomerId ?? ""}>
          add a payment method
        </StripePortalLink>{" "}
        to retain access to team features after the trial ends on{" "}
        {formattedPeriodEndDate}.
      </Paragraph>
    );
  }

  switch (purchaseStatus) {
    case PurchaseStatus.Trialing: {
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
            <Anchor className="cursor-default" onClick={openTrialEndDialog}>
              terminate the trial early
            </Anchor>
            .
          </Paragraph>
        </>
      );
    }

    case PurchaseStatus.Active: {
      if (hasForcedPlan) {
        return (
          <Paragraph>
            You are on a specific plan that is not available for purchase.
            Contact our Sales team to learn more.
          </Paragraph>
        );
      }

      return (
        <Paragraph>
          The next payment will occur on {formattedPeriodEndDate}.
        </Paragraph>
      );
    }

    case PurchaseStatus.Missing:
    case PurchaseStatus.Canceled: {
      return trialStatus === TrialStatus.Expired ? (
        <Paragraph>Subscribe to Pro plan to use team features.</Paragraph>
      ) : (
        <>
          <Paragraph>
            {now < FREE_PLAN_EXPIRATION_DATE
              ? "Starting June 1st, 2023, a Pro plan will be required to use team features."
              : "Subscribe to Pro plan to use team features."}
          </Paragraph>
          {hasGithubPurchase && (
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
  isPrivate,
  screenshotsLimitPerMonth,
}: {
  projects: Project[];
  isPrivate: boolean;
  screenshotsLimitPerMonth: number;
}) => {
  const disclosure = useDisclosureState({ defaultOpen: false });
  const screenshotsSum = projects.reduce(
    (sum, project) => project.currentMonthUsedScreenshots + sum,
    0
  );
  const max =
    isPrivate && screenshotsLimitPerMonth !== -1
      ? screenshotsLimitPerMonth
      : Infinity;

  return (
    <div className="flex flex-col gap-2 rounded border border-border p-4">
      <div className="font-medium">
        {isPrivate ? "Private" : "Public"} projects
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between font-medium">
          <div>
            {screenshotsSum.toLocaleString()}{" "}
            {screenshotsSum > 1 ? "screenshots" : "screenshot"}
          </div>
          <div className="text-on-light">
            / {max === Infinity ? "Unlimited" : max.toLocaleString()}
          </div>
        </div>
        <Progress value={screenshotsSum} max={max} min={0} />
      </div>

      <Disclosure
        state={disclosure}
        className={clsx(
          "text-sm text-on-light transition hover:text-on focus:outline-none",
          projects.length === 0 ? "hidden" : ""
        )}
      >
        {disclosure.open ? "Hide" : "Show"} usage detail{" "}
        {disclosure.open ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </Disclosure>

      <DisclosureContent
        state={disclosure}
        as="ul"
        className="mt-2 text-sm text-on-light"
      >
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex items-center justify-between border-b border-b-border px-1 py-1 last:border-b-0"
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

const CustomNeedsButton = () => (
  <div className="flex items-center gap-2">
    Custom needs?
    <Button color="neutral" variant="outline">
      {(buttonProps) => (
        <a href={`mailto:${config.get("contactEmail")}`} {...buttonProps}>
          Contact Sales
        </a>
      )}
    </Button>
  </div>
);

const PrimaryCta = ({
  purchaseStatus,
  accountId,
  stripeCustomerId,
}: {
  purchaseStatus: PurchaseStatus | null | undefined;
  accountId: string;
  stripeCustomerId: string | null;
}) => {
  if (!purchaseStatus) {
    return (
      <Button>
        {(buttonProps) => (
          <RouterLink to="/teams/new" {...buttonProps}>
            <ButtonIcon>
              <UserPlusIcon />
            </ButtonIcon>
            Create a Team
          </RouterLink>
        )}
      </Button>
    );
  }

  if (
    purchaseStatus === PurchaseStatus.Missing ||
    purchaseStatus === PurchaseStatus.Canceled
  ) {
    return (
      <UpgradeDialogButton
        currentAccountId={accountId}
        stripeCustomerId={stripeCustomerId}
      />
    );
  }

  return null;
};

const groupByPrivacy = (projects: Project[]) => {
  return projects.reduce<[Project[], Project[]]>(
    ([privateProjects, publicProjects], project) => {
      if (project.currentMonthUsedScreenshots > 0) {
        const group = project.public ? publicProjects : privateProjects;
        group.push(project);
      }
      return [privateProjects, publicProjects];
    },
    [[], []]
  );
};

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p className="mt-2 text-on-light">{children}</p>
);

const ManageSubscriptionButton = ({
  stripeCustomerId,
  paymentProvider,
}: {
  stripeCustomerId: string;
  paymentProvider: PurchaseSource | null;
}) => {
  if (paymentProvider === PurchaseSource.Github) {
    <Anchor href={config.get("github.marketplaceUrl")} external>
      Manage your subscription
    </Anchor>;
  }

  if (paymentProvider === PurchaseSource.Stripe && stripeCustomerId) {
    <StripePortalLink stripeCustomerId={stripeCustomerId}>
      Manage your subscription
    </StripePortalLink>;
  }

  return null;
};

export const PlanCard = (props: { account: AccountFragment }) => {
  const account = useFragment(PlanCardFragment, props.account);
  const {
    plan,
    projects,
    purchaseStatus,
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

  const [terminateTrial, { loading: terminateTrialLoading }] = useMutation(
    TerminateTrialMutation,
    {
      optimisticResponse: (variables) => ({
        terminateTrial: {
          id: variables.accountId,
          purchaseStatus: PurchaseStatus.Active,
          __typename: "Team" as const,
        },
      }),
    }
  );

  const [privateProjects, publicProjects] = groupByPrivacy(projects.edges);

  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <CardParagraph>
          <PlanStatus
            purchaseStatus={purchaseStatus}
            planName={plan?.name ?? ""}
            trialStatus={trialStatus ?? null}
          />
          <PlanStatusDescription
            openTrialEndDialog={() => setShowTrialEndDialog(true)}
            hasGithubPurchase={paymentProvider === PurchaseSource.Github}
            account={account}
          />
        </CardParagraph>

        {plan ? (
          <>
            <CardSeparator className="my-6" />
            <div className="font-medium">
              Current period ({<Time date={periodStartDate} format="MMM DD" />}{" "}
              - {<Time date={periodEndDate} format="MMM DD" />})
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <ConsumptionBlock
                projects={privateProjects}
                isPrivate={true}
                screenshotsLimitPerMonth={plan.screenshotsLimitPerMonth}
              />
              <ConsumptionBlock
                projects={publicProjects}
                isPrivate={false}
                screenshotsLimitPerMonth={plan.screenshotsLimitPerMonth}
              />
            </div>
          </>
        ) : null}
      </CardBody>

      <CardFooter>
        {account.hasForcedPlan ? (
          <ContactLink />
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <ManageSubscriptionButton
                stripeCustomerId={stripeCustomerId ?? ""}
                paymentProvider={paymentProvider ?? null}
              />
            </div>

            <div className="flex items-center gap-4">
              <CustomNeedsButton />
              <PrimaryCta
                purchaseStatus={purchaseStatus}
                accountId={account.id}
                stripeCustomerId={stripeCustomerId ?? ""}
              />
            </div>
          </div>
        )}
      </CardFooter>

      {purchaseStatus === PurchaseStatus.Trialing && stripeCustomerId && (
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
