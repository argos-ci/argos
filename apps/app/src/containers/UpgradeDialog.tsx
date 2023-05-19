import { UserPlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Link } from "react-router-dom";

import config from "@/config";
import { Button, ButtonColor, ButtonIcon } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDisclosure,
  DialogDismiss,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Anchor } from "@/ui/Link";
import { RadioField, RadioGroup, useRadioState } from "@/ui/Radio";

// import { StripeCheckoutButton } from "@/ui/StripeLink";
import { AccountSelector, AccountSelectorQuery } from "./AccountSelector";
import { useQuery } from "./Apollo";

type ServiceProvider = "stripe" | "github";

const DialogFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="border-t border-t-dialog-border p-4">{children}</div>
);

const SubscribeButton = ({
  provider,
  disabled,
  accountSlug,
}: {
  provider: ServiceProvider;
  disabled: boolean;
  accountSlug: string | null;
}) => {
  if (provider === "github") {
    return (
      <Button disabled={disabled}>
        {(buttonProps) => (
          <a href={config.get("github.marketplaceUrl")} {...buttonProps}>
            Continue
          </a>
        )}
      </Button>
    );
  }

  // return (
  //   <StripeCheckoutButton accountId={accountId} disabled={disabled}>
  //     Continue
  //   </StripeCheckoutButton>
  // );

  return (
    <Button disabled={!accountSlug || disabled}>
      {(buttonProps) => (
        <Link to={`/${accountSlug}/checkout`} {...buttonProps}>
          Continue
        </Link>
      )}
    </Button>
  );
};

const ProviderRedirectMessage = ({
  provider,
  canGetTrial,
}: {
  provider: ServiceProvider;
  canGetTrial: boolean;
}) => {
  const providerPlatform =
    provider === "stripe" ? "Stripe" : "GitHub Marketplace";
  const action =
    provider === "stripe" && canGetTrial
      ? "start a 14-day Pro plan trial"
      : "complete the subscription";
  return (
    <p className="h-8 font-medium text-on">
      You will be redirect to {providerPlatform} to {action}.
    </p>
  );
};

export const UpgradeDialogButton = ({
  children,
  currentAccountId,
  color = "primary",
}: {
  children?: React.ReactNode;
  currentAccountId?: string;
  color?: ButtonColor;
}) => {
  const dialog = useDialogState();
  const [provider, setProvider] = useState<ServiceProvider>("stripe");
  const radio = useRadioState({
    value: provider,
    setValue: (value) => setProvider(value as ServiceProvider),
  });
  const [accountId, setAccountId] = useState<string>(currentAccountId ?? "");
  const { data } = useQuery(AccountSelectorQuery);
  const disabledAccountIds =
    data && data.me
      ? data.me.teams.filter((a) => a.hasPaidPlan).map((a) => a.id)
      : [];
  const disableSubmit = provider === "stripe" && !accountId;
  const canGetTrial = Boolean(data?.me && !data?.me?.hasSubscribedToTrial);
  const account = data?.me?.teams.find((a) => a.id === accountId);

  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color={color}>
            {children || "Upgrade"}
          </Button>
        )}
      </DialogDisclosure>

      <Dialog state={dialog} style={{ width: 560 }}>
        <DialogBody>
          <DialogTitle>Subscribe to Pro plan</DialogTitle>

          <div className="mt-2 flex flex-col gap-4">
            <div>
              <DialogText className="font-semibold">
                Pick a payment provider
              </DialogText>
              <RadioGroup
                state={radio}
                className="flex w-full flex-col justify-start gap-6"
              >
                <RadioField label="Stripe" value="stripe">
                  Usage-based plan that suit your screenshot needs.{" "}
                  <Anchor href="https://argos-ci.com/pricing" external>
                    See plans
                  </Anchor>
                </RadioField>
                <RadioField label="GitHub Marketplace" value="github">
                  Fixed price plans added straight to your GitHub bill.{" "}
                  <Anchor href={config.get("github.marketplaceUrl")} external>
                    See plans
                  </Anchor>
                </RadioField>
              </RadioGroup>
            </div>

            <div className="block h-24">
              <DialogText className="font-semibold">Select a Team</DialogText>
              {provider === "stripe" ? (
                <AccountSelector
                  value={accountId}
                  setValue={setAccountId}
                  accounts={data && data.me ? data.me.teams : []}
                  disabledAccountIds={disabledAccountIds}
                />
              ) : (
                <DialogText>
                  On <span className="text-medium">GitHub Marketplace</span>{" "}
                  select the organization that hosts your repository.
                </DialogText>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <ProviderRedirectMessage
            provider={provider}
            canGetTrial={canGetTrial}
          />

          <div className="flex items-center justify-between gap-10">
            <Button variant="outline" color="neutral">
              {(buttonProps) => (
                <Link to="/teams/new" {...buttonProps}>
                  <ButtonIcon>
                    <UserPlusIcon />
                  </ButtonIcon>
                  Create a new Team
                </Link>
              )}
            </Button>

            <div className="flex items-center gap-4">
              <DialogDismiss>Cancel</DialogDismiss>

              <SubscribeButton
                provider={provider}
                disabled={disableSubmit}
                // accountId={accountId}
                accountSlug={account?.slug ?? null}
              />
            </div>
          </div>
        </DialogFooter>
      </Dialog>
    </>
  );
};
