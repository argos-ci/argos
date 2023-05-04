import { ArrowLongRightIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, CurrencyDollarIcon } from "@heroicons/react/24/solid";
import { clsx } from "clsx";
import { ReactNode } from "react";
import { Helmet } from "react-helmet";
import {
  Controller,
  FormProvider,
  SubmitHandler,
  useForm,
} from "react-hook-form";
import { useParams } from "react-router-dom";

import { AccountSelector } from "@/containers/AccountSelector";
import { Query } from "@/containers/Apollo";
import { useAuth } from "@/containers/Auth";
import { graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Container } from "@/ui/Container";
import {
  Dialog,
  DialogBody,
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogState,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { Loader } from "@/ui/Loader";
import { PageLoader } from "@/ui/PageLoader";
import { MagicTooltip } from "@/ui/Tooltip";
import { Heading } from "@/ui/Typography";

import { useAccountContext } from ".";

const AccountQuery = graphql(`
  query AccountCheckout_account($slug: String!) {
    account(slug: $slug) {
      id
      stripeClientReferenceId
      purchase {
        id
        source
      }
      plan {
        id
        name
      }
    }
  }
`);

const HOBBY_PLAN_SCREENSHOT_COUNT = 5000;
const PRO_PLAN_SCREENSHOT_COUNT = 15000;

const Price = ({
  amount,
  recurring,
  fixedPrice,
}: {
  amount: number;
  recurring: boolean;
  fixedPrice: boolean;
}) => (
  <>
    <div className="mb-1 mt-6 block h-5 text-sm">
      {fixedPrice ? null : "Starting at"}
    </div>
    <div className="flex items-baseline">
      <span className="text-3xl font-semibold text-on">
        $<span className="tracking-tight">{amount}</span>
      </span>
      {recurring && <span className="ml-1 text-lg text-on-light">/month</span>}
    </div>
    <div className="mt-1 block h-5 text-sm">
      {fixedPrice ? "forever" : "Billed monthly based on usage"}
    </div>
  </>
);

const Features = ({ children }: { children: ReactNode }) => (
  <ul className="my-6 flex flex-col gap-4">{children}</ul>
);

const Feature = ({ children }: { children: ReactNode }) => (
  <li className="flex gap-2">
    <CheckCircleIcon className="h-5 w-5 shrink-0 text-on" />
    <div className="leading-tight">{children}</div>
  </li>
);

const PlanCard = ({
  children,
  emphasis,
  className,
}: {
  children: ReactNode;
  emphasis?: boolean;
  className?: string;
}) => (
  <Card
    className={clsx(
      className,
      "flex-1 shrink-0 basis-72 rounded-lg lg:max-w-[340px]",
      emphasis ? "border-2 border-slate-500 pt-4" : ""
    )}
  >
    {children}
  </Card>
);

const PlanCardBody = ({ children }: { children: ReactNode }) => (
  <div className="p-8 text-left text-on-light antialiased">{children}</div>
);

const PlanName = ({ children }: { children: ReactNode }) => (
  <div className="my-2 text-xl font-semibold text-on">{children}</div>
);

const PlanDescription = ({ children }: { children: ReactNode }) => (
  <p className="h-16">{children}</p>
);

const Chips = ({ children }: { children?: ReactNode }) => (
  <div className="block h-8">{children}</div>
);

type ReviewInputs = {
  accountId: string;
};

const SelectTeamDialog = ({
  state,
  actualAccountId,
}: {
  state: DialogState;
  actualAccountId: string;
}) => {
  const { token } = useAuth();
  const form = useForm<ReviewInputs>({
    defaultValues: { accountId: actualAccountId },
  });

  const onSubmit: SubmitHandler<ReviewInputs> = async (data) => {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ accountId: data.accountId }),
    });
    const json = await response.json();

    if (response.ok) {
      window.location.href = json.sessionUrl;
    } else {
      console.error("Error:", json.message);
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog state={state} style={{ width: 560 }}>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <DialogBody>
            <DialogTitle>Select Account</DialogTitle>
            <DialogText>
              Choose an Argos Account to start your 14-day trial.
            </DialogText>
            <Controller
              name="accountId"
              control={form.control}
              render={({ field: { value, onChange } }) => (
                <AccountSelector value={value} setValue={onChange} />
              )}
            />
          </DialogBody>
          <DialogFooter>
            <DialogDismiss>Cancel</DialogDismiss>
            <Button type="submit" disabled={submitting}>
              Start trial
              <div className="ml-2">
                <Loader
                  size={14}
                  className={clsx(submitting ? "" : "hidden")}
                />
                <ArrowLongRightIcon
                  className={clsx(
                    "h-[1em] w-[1em] shrink-0",
                    submitting ? "hidden" : ""
                  )}
                />
              </div>
            </Button>
          </DialogFooter>
        </Form>
      </FormProvider>
    </Dialog>
  );
};

export const AccountCheckout = () => {
  const { accountSlug } = useParams();
  const { hasWritePermission } = useAccountContext();
  const dialog = useDialogState();

  if (!accountSlug) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>{accountSlug} • Checkout</title>
      </Helmet>
      <Heading>Subscribe to a plan</Heading>
      <Query
        fallback={<PageLoader />}
        query={AccountQuery}
        variables={{ slug: accountSlug }}
      >
        {({ account }) => {
          if (!account) return <NotFound />;
          if (account.purchase) return <NotFound />;

          return (
            <div className="mb-10 mt-8 flex flex-wrap justify-evenly gap-6 lg:justify-center">
              <PlanCard className="mt-4">
                <PlanCardBody>
                  <Chips />
                  <PlanName>Hobby</PlanName>
                  <PlanDescription>For personal projects.</PlanDescription>
                  <Price amount={0} recurring={false} fixedPrice={true} />
                  <Button
                    className="my-6 w-full justify-center"
                    variant="outline"
                    size="large"
                    color="neutral"
                    disabled
                  >
                    {(buttonProps) => (
                      <a {...buttonProps} href="/">
                        Actual plan
                      </a>
                    )}
                  </Button>
                  <Features>
                    <Feature>
                      Up to {HOBBY_PLAN_SCREENSHOT_COUNT.toLocaleString()}{" "}
                      screenshots
                    </Feature>
                    <Feature>Visual changes detection</Feature>
                    <Feature>GitHub integration</Feature>
                    <Feature>Community Support</Feature>
                  </Features>
                </PlanCardBody>
              </PlanCard>

              <PlanCard emphasis>
                <PlanCardBody>
                  <Chips>
                    <Chip scale="sm">Most popular</Chip>
                  </Chips>
                  <PlanName>Pro</PlanName>
                  <PlanDescription>
                    Designed for team collaboration with advanced features.
                  </PlanDescription>
                  <Price amount={30} recurring={true} fixedPrice={false} />

                  <DialogDisclosure state={dialog}>
                    {(disclosureProps) => (
                      <Button
                        {...disclosureProps}
                        size="large"
                        className="my-6 w-full justify-center"
                        color="primary"
                        style={{ cursor: "pointer" }}
                      >
                        Start a free trial
                      </Button>
                    )}
                  </DialogDisclosure>
                  <SelectTeamDialog
                    state={dialog}
                    actualAccountId={account.id}
                  />
                  <Features>
                    <Feature>
                      <span className="whitespace-nowrap ">
                        {PRO_PLAN_SCREENSHOT_COUNT.toLocaleString()} screenshots
                        <MagicTooltip
                          tooltip="Then $0.0025 per screenshot after"
                          timeout={0}
                        >
                          <CurrencyDollarIcon className="ml-1 inline-block h-4 w-4 text-on" />
                        </MagicTooltip>
                      </span>
                    </Feature>
                    <Feature>Visual changes detection</Feature>
                    <Feature>GitHub integration</Feature>
                    <Feature>Pro Support</Feature>
                    <Feature>Collaborating visual review</Feature>
                  </Features>
                </PlanCardBody>
              </PlanCard>

              <PlanCard className="mt-0 lg:mt-4">
                <PlanCardBody>
                  <Chips />
                  <PlanName>Enterprise</PlanName>
                  <PlanDescription>
                    Tailored solutions with premium features.
                  </PlanDescription>
                  <div className="mb-6 mt-12 flex items-baseline text-3xl font-semibold text-on">
                    Custom
                  </div>

                  <Button
                    size="large"
                    className="my-6 w-full justify-center"
                    variant="outline"
                  >
                    {(buttonProps) => (
                      <a {...buttonProps} href="mailto:contact@argos-ci.com">
                        Contact Sales
                      </a>
                    )}
                  </Button>
                  <Features>
                    <Feature>Custom amount of screenshots</Feature>
                    <Feature>Visual changes detection</Feature>
                    <Feature>GitHub integration</Feature>
                    <Feature>Dedicated Support</Feature>
                    <Feature>Collaborating visual review</Feature>
                    <Feature>SLA for 99.99% Uptime</Feature>
                  </Features>
                </PlanCardBody>
              </PlanCard>
            </div>
          );
        }}
      </Query>
    </Container>
  );
};
