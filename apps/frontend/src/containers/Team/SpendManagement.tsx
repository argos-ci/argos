import { useApolloClient } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { useAccountContext } from "@/pages/Account";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { CircleProgress } from "@/ui/Progress";
import { Separator } from "@/ui/Separator";
import { SwitchField } from "@/ui/Switch";

const _AccountFragment = graphql(`
  fragment TeamSpendManagement_Account on Account {
    id
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

function SpendManagementForm(props: {
  account: DocumentType<typeof _AccountFragment>;
}) {
  const { account } = props;
  invariant(account.subscription, "Subscription is required");

  const { permissions } = useAccountContext();
  const hasAdminPermission = permissions.includes(AccountPermission.Admin);
  const form = useForm<Inputs>({
    disabled: !hasAdminPermission,
    defaultValues: {
      isSpendLimitEnabled:
        typeof account.meteredSpendLimitByPeriod === "number",
      meteredSpendLimitByPeriod: account.meteredSpendLimitByPeriod,
      blockWhenSpendLimitIsReached: account.blockWhenSpendLimitIsReached,
    },
  });

  const apolloClient = useApolloClient();
  const isSpendLimitEnabled = form.watch("isSpendLimitEnabled");
  const rawMeteredSpendLimitByPeriod = form.watch("meteredSpendLimitByPeriod");
  const meteredSpendLimitByPeriod = Number.isInteger(
    rawMeteredSpendLimitByPeriod,
  )
    ? (rawMeteredSpendLimitByPeriod as number)
    : 0;
  const additionalScreenshotsCost = account.additionalScreenshotsCost;
  const currency = account.subscription.currency;
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await apolloClient.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: account.id,
        meteredSpendLimitByPeriod: data.isSpendLimitEnabled
          ? data.meteredSpendLimitByPeriod
          : null,
        blockWhenSpendLimitIsReached: data.isSpendLimitEnabled
          ? data.blockWhenSpendLimitIsReached
          : false,
      },
    });
  };
  const defaultMeteredSpendLimitByPeriodProps = form.register(
    "meteredSpendLimitByPeriod",
    {
      valueAsNumber: true,
      validate: (value) => {
        if (!value) {
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

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  });

  const currencyFormatterNoDigits = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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
              <strong>100%</strong> of the set amount. You can choose to block
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
                        {currencyFormatter.format(additionalScreenshotsCost)} /{" "}
                        {currencyFormatterNoDigits.format(
                          meteredSpendLimitByPeriod,
                        )}{" "}
                        (
                        {(
                          (additionalScreenshotsCost /
                            (meteredSpendLimitByPeriod || 1)) *
                          100
                        ).toFixed(0)}
                        %)
                      </div>
                    ) : (
                      <div className="font-medium">
                        Current period additional costs —{" "}
                        {currencyFormatter.format(additionalScreenshotsCost)}
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
                  <div className="bg-subtle flex flex-col gap-6 p-4">
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
                      className="max-w-[200px]"
                      placeholder={currencyFormatterNoDigits.format(0)}
                    />
                    <FormSwitch
                      control={form.control}
                      name="blockWhenSpendLimitIsReached"
                      label="Pause builds when spend limit is reached"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </CardBody>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
}
