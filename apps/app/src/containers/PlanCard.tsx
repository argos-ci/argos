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
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
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

const TerminateTrialMutation = graphql(`
  mutation terminateTrial($purchaseId: ID!, $stripeCustomerId: String!) {
    terminateTrial(
      purchaseId: $purchaseId
      stripeCustomerId: $stripeCustomerId
    ) {
      id
      trialEndDate
      __typename
    }
  }
`);

const PlanCardFragment = graphql(`
  fragment PlanCard_Account on Account {
    id
    slug
    stripeCustomerId
    periodStartDate
    periodEndDate
    hasPaidPlan
    __typename

    plan {
      id
      name
      screenshotsLimitPerMonth
      usageBased
    }

    purchase {
      id
      source
      paymentMethodFilled
      endDate
      trialEndDate
      isTrialActive
    }

    oldPaidPurchase {
      id
      endDate
      trialEndDate
      plan {
        id
        name
      }
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

const TrialChip = ({ expired }: { expired: boolean }) => {
  return (
    <span className="ml-2">
      {expired ? (
        <Chip scale="sm" color="danger">
          Trial expired
        </Chip>
      ) : (
        <Chip scale="sm" color="info">
          Trial
        </Chip>
      )}
    </span>
  );
};

const TrialStatus = ({
  trialCanceled,
  trialEndDate,
  paymentMethodFilled,
  stripeCustomerId,
  usageBasedPricing,
  openTrialEndDialog,
}: {
  trialIsActive: boolean;
  trialCanceled: boolean;
  trialEndDate: string;
  paymentMethodFilled: boolean;
  stripeCustomerId: string;
  usageBasedPricing: boolean;
  openTrialEndDialog: () => void;
}) => {
  if (trialCanceled) {
    return (
      <div className="mt-2 text-on-light">
        Trial cancelled. You can still use the service until the trial period
        ends on ${trialEndDate}.
      </div>
    );
  }

  if (!paymentMethodFilled) {
    return (
      <div className="mt-2 text-on-light">
        Please{" "}
        <StripePortalLink stripeCustomerId={stripeCustomerId}>
          add a payment method
        </StripePortalLink>{" "}
        to be able to create builds after the trial ends.{" "}
      </div>
    );
  }

  return (
    <div>
      <div className="mt-2 text-on-light">
        Your subscription will automatically begin after the trial ends on{" "}
        {trialEndDate}.
      </div>

      {usageBasedPricing && (
        <div className="mt-2 text-on-light">
          To remove the screenshot limitation and enable usage-based pricing,
          you can{" "}
          <Anchor className="cursor-default" onClick={openTrialEndDialog}>
            terminate the trial early
          </Anchor>
          .
        </div>
      )}
    </div>
  );
};

const ConfirmTrialEndDialog = ({
  state,
  terminateTrial,
  loading,
  purchaseId,
  stripeCustomerId,
}: {
  state: DialogState;
  terminateTrial: (props: {
    variables: any;
  }) => Promise<FetchResult<{ terminateTrial: any }>>;
  loading: boolean;
  purchaseId: string;
  stripeCustomerId: string;
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
              variables: { purchaseId, stripeCustomerId },
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

const SubscriptionStatus = ({
  account,
  trialExpired,
}: {
  account: any;
  trialExpired: boolean;
}) => {
  const { type: accountType, plan, oldPaidPurchase, hasPaidPlan } = account;
  if (accountType === "User") {
    return <>Your Personal account is on the Free plan. Free of charge.</>;
  }
  if (hasPaidPlan) {
    return <>Your team is on the {plan!.name} plan.</>;
  }
  if (trialExpired) {
    return <>Your trial has expired.</>;
  }
  if (oldPaidPurchase) {
    return <>Your plan has been cancelled.</>;
  }
  return <>Your team has no paid plan.</>;
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

const PlanActions = ({
  hasPaidPlan,
  hasPurchase,
  stripeCustomerId,
  accountId,
  accountType,
}: {
  hasPaidPlan: boolean;
  hasPurchase: boolean;
  stripeCustomerId: string | null;
  accountId: string;
  accountType: "User" | "Team";
}) => {
  if (accountType === "User") {
    return (
      <div className="flex items-center justify-between">
        <Anchor href={`mailto:${config.get("contactEmail")}`} external>
          Contact Sales
        </Anchor>
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
      </div>
    );
  }

  if (!hasPaidPlan) {
    return (
      <div className="flex items-center justify-between">
        <Anchor href={`mailto:${config.get("contactEmail")}`} external>
          Contact Sales
        </Anchor>
        <UpgradeDialogButton currentAccountId={accountId} />
      </div>
    );
  }

  if (hasPurchase) {
    return (
      <div className="flex items-center justify-between">
        {stripeCustomerId ? (
          <StripePortalLink stripeCustomerId={stripeCustomerId}>
            Manage your subscription
          </StripePortalLink>
        ) : (
          <Anchor href={config.get("github.marketplaceUrl")} external>
            Manage your subscription
          </Anchor>
        )}
        <div className="flex items-center gap-2">
          Custom needs?
          <Button>
            {(buttonProps) => (
              <a href={`mailto:${config.get("contactEmail")}`} {...buttonProps}>
                Contact Sales
              </a>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return <ContactLink />;
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

export const PlanCard = (props: { account: AccountFragment }) => {
  const account = useFragment(PlanCardFragment, props.account);
  const {
    plan,
    projects,
    purchase,
    oldPaidPurchase,
    hasPaidPlan,
    __typename: accountType,
  } = account;
  const [showTrialEndDialog, setShowTrialEndDialog] = useState(false);
  const confirmTrialEndDialogState = useDialogState({
    open: showTrialEndDialog,
  });
  const [terminateTrial, { loading: terminateTrialLoading }] = useMutation(
    TerminateTrialMutation,
    {
      optimisticResponse: (variables) => ({
        terminateTrial: {
          id: variables.purchaseId,
          trialEndDate: new Date().toISOString(),
          __typename: "Purchase" as const,
        },
      }),
    }
  );

  const trialExpired =
    !hasPaidPlan &&
    oldPaidPurchase?.trialEndDate &&
    oldPaidPurchase.trialEndDate === oldPaidPurchase.endDate;
  const [privateProjects, publicProjects] = groupByPrivacy(projects.edges);
  const trialIsActive = purchase && purchase.isTrialActive;

  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <CardParagraph>
          <SubscriptionStatus account={account} trialExpired={trialExpired} />{" "}
          {(trialIsActive || trialExpired) && (
            <TrialChip expired={trialExpired} />
          )}
          {hasPaidPlan && !trialIsActive && (
            <span className="text-on-light">
              The next payment will occur on{" "}
              {moment(account.periodEndDate).format("LL")}.
            </span>
          )}
          {!hasPaidPlan && (
            <Anchor href="https://argos-ci.com/pricing" external>
              Learn more
            </Anchor>
          )}
          {accountType === "Team" && !hasPaidPlan && (
            <div className="mt-2 text-on-light">
              Subscribe to Pro plan to use team features.
            </div>
          )}
          {trialIsActive && account.stripeCustomerId && plan && (
            <TrialStatus
              trialIsActive={trialIsActive}
              paymentMethodFilled={!!purchase.paymentMethodFilled}
              stripeCustomerId={account.stripeCustomerId}
              trialEndDate={moment(purchase.trialEndDate).format("LLL")}
              trialCanceled={purchase.trialEndDate === purchase.endDate}
              usageBasedPricing={plan.usageBased}
              openTrialEndDialog={() => setShowTrialEndDialog(true)}
            />
          )}
        </CardParagraph>

        {plan ? (
          <>
            <CardSeparator className="my-6" />
            <div className="font-medium">
              Current period (
              {<Time date={account.periodStartDate} format="MMM DD" />} -{" "}
              {<Time date={account.periodEndDate} format="MMM DD" />})
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
        <PlanActions
          hasPaidPlan={hasPaidPlan}
          hasPurchase={!!purchase}
          stripeCustomerId={account.stripeCustomerId ?? null}
          accountId={account.id}
          accountType={accountType}
        />
      </CardFooter>

      {trialIsActive && plan?.usageBased && account.stripeCustomerId && (
        <ConfirmTrialEndDialog
          state={confirmTrialEndDialogState}
          loading={terminateTrialLoading}
          terminateTrial={terminateTrial}
          purchaseId={purchase.id}
          stripeCustomerId={account.stripeCustomerId}
        />
      )}
    </Card>
  );
};
