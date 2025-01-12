import { useState } from "react";
import { useMutation } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { CircleCheckIcon } from "lucide-react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Modal } from "@/ui/Modal";
import { CircleProgress } from "@/ui/Progress";
import { Separator } from "@/ui/Separator";
import { SwitchField } from "@/ui/Switch";

const _AccountFragment = graphql(`
  fragment TeamSpendManagement_Account on Account {
    id
    name
    slug
    meteredSpendLimitByPeriod
    blockWhenSpendLimitIsReached
    additionalScreenshotsCost
    subscription {
      id
      currency
    }
  }
`);

const UpdateAccountMutation = graphql(`
  mutation TeamSpendManagement_updateAccount(
    $id: ID!
    $meteredSpendLimitByPeriod: Int
    $blockWhenSpendLimitIsReached: Boolean
  ) {
    updateAccount(
      input: {
        id: $id
        meteredSpendLimitByPeriod: $meteredSpendLimitByPeriod
        blockWhenSpendLimitIsReached: $blockWhenSpendLimitIsReached
      }
    ) {
      ...TeamSpendManagement_Account
    }
  }
`);

type Inputs = {
  isSpendLimitEnabled: boolean;
  meteredSpendLimitByPeriod: number | null;
  blockWhenSpendLimitIsReached: boolean;
};

export function TeamSpendManagement(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  if (!account.subscription) {
    return null;
  }
  return <SpendManagementForm account={account} />;
}

function formatCurrency(value: number, currency: string, digits = 2) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function SpendManagementForm(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.subscription, "Subscription is required");

  const { permissions } = useAccountContext();
  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  const defaultValues: Inputs = {
    isSpendLimitEnabled: typeof account.meteredSpendLimitByPeriod === "number",
    meteredSpendLimitByPeriod: account.meteredSpendLimitByPeriod ?? null,
    blockWhenSpendLimitIsReached: account.blockWhenSpendLimitIsReached,
  };
  const form = useForm<Inputs>({
    disabled: !hasAdminPermission,
    defaultValues,
  });

  const isSpendLimitEnabled = form.watch("isSpendLimitEnabled");
  const rawMeteredSpendLimitByPeriod = form.watch("meteredSpendLimitByPeriod");
  const meteredSpendLimitByPeriod = Number.isInteger(
    rawMeteredSpendLimitByPeriod,
  )
    ? (rawMeteredSpendLimitByPeriod as number)
    : 0;
  const additionalScreenshotsCost = account.additionalScreenshotsCost;
  const currency = account.subscription.currency;
  const [confirmation, setConfirmation] = useState<{
    data: Inputs;
    isOpen: boolean;
  }>({
    data: defaultValues,
    isOpen: false,
  });
  const [updateAccount, updateAccountResult] = useMutation(
    UpdateAccountMutation,
  );
  const isSuccessful = updateAccountResult.data != null;
  const onSubmit: SubmitHandler<Inputs> = (data) => {
    setConfirmation({ data, isOpen: true });
  };
  const defaultMeteredSpendLimitByPeriodProps = form.register(
    "meteredSpendLimitByPeriod",
    {
      valueAsNumber: true,
      validate: (value) => {
        if (value == null) {
          return "Required";
        }
        if (!Number.isInteger(value)) {
          return "Must be an integer";
        }
        if (value < 0) {
          return "Must be greater than or equal to 0";
        }
        return undefined;
      },
    },
  );

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit} noValidate>
          <CardBody>
            <CardTitle id="spend-management">Spend Management</CardTitle>
            <CardParagraph>
              Set a spend amount towards additional screenshots cost. All
              account owners will be notified when the spend amount reaches{" "}
              <strong>50%</strong>, <strong>75%</strong>, and{" "}
              <strong>100%</strong> of the set amount. You can choose to pause
              builds when the spend amount limit is reached.
            </CardParagraph>
            <div className="overflow-hidden rounded border">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-2">
                  <CircleProgress
                    radius={24}
                    strokeWidth={12}
                    value={isSpendLimitEnabled ? additionalScreenshotsCost : 0}
                    min={0}
                    max={
                      isSpendLimitEnabled ? (meteredSpendLimitByPeriod ?? 0) : 1
                    }
                  />
                  <div>
                    {isSpendLimitEnabled ? (
                      <div className="font-medium">
                        {formatCurrency(additionalScreenshotsCost, currency)} /{" "}
                        {formatCurrency(meteredSpendLimitByPeriod, currency, 0)}{" "}
                        (
                        {Math.min(
                          (additionalScreenshotsCost /
                            (meteredSpendLimitByPeriod || 1)) *
                            100,
                          100,
                        ).toFixed(0)}
                        %)
                      </div>
                    ) : (
                      <div className="font-medium">
                        Current period additional costs —{" "}
                        {formatCurrency(additionalScreenshotsCost, currency)}
                      </div>
                    )}
                    <div
                      className={clsx(
                        "text-low text-sm",
                        isSpendLimitEnabled && "text-sm",
                      )}
                    >
                      {isSpendLimitEnabled
                        ? "Spend management enabled"
                        : "Spend management disabled"}
                    </div>
                  </div>
                </div>
                <SwitchField
                  control={form.control}
                  name="isSpendLimitEnabled"
                />
              </div>
              {isSpendLimitEnabled && hasAdminPermission ? (
                <>
                  <Separator orientation="horizontal" />
                  <div className="bg-subtle grid grid-cols-2 p-4">
                    <FormTextInput
                      {...defaultMeteredSpendLimitByPeriodProps}
                      ref={(element) => {
                        defaultMeteredSpendLimitByPeriodProps.ref(element);
                        if (
                          element &&
                          form.formState.defaultValues?.isSpendLimitEnabled !==
                            isSpendLimitEnabled
                        ) {
                          element.focus();
                        }
                      }}
                      label="Set amount"
                      type="number"
                      pattern="\d*"
                      min={0}
                      step={50}
                      inputMode="numeric"
                      formNoValidate
                      addon={currency}
                      placeholder={formatCurrency(0, currency, 0)}
                      description={
                        <>
                          Set the additional screenshots usage amount, to
                          trigger notifications if the amount is reached within
                          a billing period.
                        </>
                      }
                      className="max-w-[200px]"
                    />
                    <FormSwitch
                      control={form.control}
                      name="blockWhenSpendLimitIsReached"
                      label="Pause builds"
                      description={
                        <>
                          When enabled, builds for all projects on this team
                          will be paused when the spend amount is reached.
                        </>
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          </CardBody>
          <FormCardFooter isSuccessful={isSuccessful} disableIfDirty />
        </Form>
      </FormProvider>
      <Modal
        isOpen={confirmation.isOpen}
        onOpenChange={(isOpen) =>
          setConfirmation((prev) => ({ ...prev, isOpen }))
        }
      >
        <ConfirmDialog
          account={account}
          data={confirmation.data}
          onSubmit={async () => {
            await updateAccount({
              variables: {
                id: account.id,
                meteredSpendLimitByPeriod: confirmation.data.isSpendLimitEnabled
                  ? confirmation.data.meteredSpendLimitByPeriod
                  : null,
                blockWhenSpendLimitIsReached:
                  confirmation.data.blockWhenSpendLimitIsReached,
              },
            });
            setConfirmation((prev) => ({ ...prev, isOpen: false }));
          }}
        />
      </Modal>
    </Card>
  );
}

type ConfirmInputs = {
  slug: string;
};

function ConfirmDialog(props: {
  account: DocumentType<typeof _AccountFragment>;
  data: Inputs;
  onSubmit: SubmitHandler<ConfirmInputs>;
}) {
  const { account, data } = props;
  const accountName = account.name || account.slug;
  invariant(account.subscription, "Subscription is required");
  const form = useForm<ConfirmInputs>({
    defaultValues: {
      slug: "",
    },
  });

  return (
    <Dialog size="medium">
      <FormProvider {...form}>
        <Form onSubmit={props.onSubmit}>
          <DialogBody>
            <DialogTitle>Spend Management</DialogTitle>
            {data.meteredSpendLimitByPeriod === null ? (
              <>
                <DialogText>
                  Continuing will disable spend management on the{" "}
                  <strong>{accountName}</strong> team and immediately cause the
                  following actions:
                </DialogText>
                <DialogText>
                  <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                  No further notifications will be sent when the spend limit is
                  reached.
                </DialogText>
                {account.blockWhenSpendLimitIsReached && (
                  <DialogText>
                    <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                    Builds will no longer be paused when the spend limit is
                    reached.
                  </DialogText>
                )}
              </>
            ) : data.meteredSpendLimitByPeriod <
              account.additionalScreenshotsCost ? (
              <>
                <DialogText>
                  Your current spend exceeds{" "}
                  <strong>
                    {formatCurrency(
                      data.meteredSpendLimitByPeriod,
                      account.subscription.currency,
                      0,
                    )}
                  </strong>
                  . Continuing will immediately cause the following actions on{" "}
                  {accountName} team.
                </DialogText>
                <DialogText>
                  <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                  Notifications are sent to all team owner members.
                </DialogText>
                {data.blockWhenSpendLimitIsReached && (
                  <DialogText>
                    <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                    All builds are paused.
                  </DialogText>
                )}
              </>
            ) : (
              <>
                <DialogText>
                  Your current spend is below{" "}
                  <strong>
                    {formatCurrency(
                      data.meteredSpendLimitByPeriod,
                      account.subscription.currency,
                      0,
                    )}
                  </strong>
                  . Continuing will cause the following actions on {accountName}{" "}
                  team.
                </DialogText>
                <DialogText>
                  <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                  Notifications will be sent to all team owner members.
                </DialogText>
                {data.blockWhenSpendLimitIsReached && (
                  <DialogText>
                    <CircleCheckIcon className="mr-3 inline size-[1.4em]" />
                    Builds will be paused when the spend limit is reached.
                  </DialogText>
                )}
              </>
            )}
            <FormTextInput
              {...form.register("slug", {
                validate: (value) => {
                  if (value !== account.slug) {
                    return "Team slug does not match";
                  }
                  return true;
                },
              })}
              autoFocus
              className="mb-4"
              label={
                <>
                  Enter the team slug <strong>{account.slug}</strong> to
                  continue:
                </>
              }
            />
          </DialogBody>
          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>
            <FormSubmit variant="destructive">Continue</FormSubmit>
          </DialogFooter>
        </Form>
      </FormProvider>
    </Dialog>
  );
}
