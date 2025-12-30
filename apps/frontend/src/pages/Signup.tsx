import { useEffect, useState, type ReactNode } from "react";
import { assertNever } from "@argos/util/assertNever";
import clsx from "clsx";
import { CheckIcon } from "lucide-react";
import { useObjectRef } from "react-aria";
import { Heading, Radio, RadioGroup } from "react-aria-components";
import { Helmet } from "react-helmet";
import {
  useController,
  useForm,
  type Control,
  type FieldValues,
  type Path,
  type SubmitHandler,
} from "react-hook-form";
import { Navigate, useSearchParams } from "react-router-dom";

import { PRO_PLAN_PRICING } from "@/constants";
import { useIsLoggedIn } from "@/containers/Auth";
import { SignupOptions } from "@/containers/SignupOptions";
import { BrandShield } from "@/ui/BrandShield";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Details, Summary } from "@/ui/Details";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Label } from "@/ui/Label";
import { StandalonePage } from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { formatCurrency } from "@/util/intl";

import mermaidImg from "./signup/mermaid.svg";
import metaImg from "./signup/meta.svg";
import muiImg from "./signup/mui.svg";

function AccountTypeField<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: {
  name: Path<TFieldValues>;
  control: Control<TFieldValues, TContext, TTransformedValues>;
  className?: string;
}) {
  const { control, name } = props;
  const { field } = useController({ control, name });
  const { ref } = field;
  return (
    <RadioGroup
      orientation="vertical"
      className={clsx("w-full", props.className)}
      ref={ref}
      onChange={field.onChange}
      value={field.value}
      isDisabled={field.disabled}
      onBlur={field.onBlur}
    >
      <Label>Choose your use case to get started</Label>
      <div className="flex flex-col">
        <RadioAccordion value="hobby">
          <div className="flex items-center justify-between gap-4">
            I’m working on personal projects
            <Chip color="neutral" scale="sm">
              Hobby
            </Chip>
          </div>
        </RadioAccordion>
        <RadioAccordion value="pro">
          <div className="flex items-center justify-between gap-4">
            I’m working on team projects
            <Chip color="info" scale="sm">
              Pro
            </Chip>
          </div>
        </RadioAccordion>
        <RadioAccordion value="existing-team">
          <div className="flex items-center justify-between gap-4">
            I’m joining an existing team
            <Chip color="success" scale="sm">
              Member
            </Chip>
          </div>
        </RadioAccordion>
      </div>
    </RadioGroup>
  );
}

function RadioAccordion(props: { value: string; children: ReactNode }) {
  const { children, ...rest } = props;
  return (
    <Radio
      {...rest}
      className={clsx(
        "bg-app peer flex items-center gap-4 border p-4 text-sm",
        "data-[hovered]:bg-subtle",
        "first:rounded-t first:border-b-0",
        "last:rounded-b",
        "not-first:not-last:border-b-0",
      )}
    >
      {({ isSelected }) => (
        <>
          {isSelected ? (
            <div className="bg-primary-solid flex size-5 items-center justify-center rounded-full">
              <CheckIcon className="size-3.5 text-white" />
            </div>
          ) : (
            <div className="bg-active m-1 size-3 rounded-full" />
          )}
          <div className="flex-1">{children}</div>
        </>
      )}
    </Radio>
  );
}

function ProPlanWarning() {
  return (
    <Details className="mt-4 text-sm">
      <Summary>Continuing will start a 14-day Pro plan trial.</Summary>
      <p>
        Once the trial period ends for your new Argos team, you can continue on
        the Pro plan starting at {formatCurrency(PRO_PLAN_PRICING, "USD", 0)}{" "}
        per month.
      </p>
    </Details>
  );
}

function SignupPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("r") || null;
  const isFromInvite = redirect?.startsWith("/teams/invite/") ?? false;
  const defaultEmail = searchParams.get("email") ?? "";
  const [step, setStep] = useState<
    | {
        name: "form";
      }
    | { name: "provider"; data: SignupFormTransformedValues }
  >({
    name: "form",
  });
  return (
    <StandalonePage>
      <Helmet>
        <title>Sign Up</title>
      </Helmet>

      {(() => {
        switch (step.name) {
          case "form":
            return (
              <FormStep
                isFromInvite={isFromInvite}
                onSubmit={(data) => {
                  setStep({ name: "provider", data });
                }}
              />
            );
          case "provider": {
            return (
              <ProviderStep
                isFromInvite={isFromInvite}
                redirect={redirect}
                defaultEmail={defaultEmail}
                data={step.data}
              />
            );
          }
          default:
            assertNever(step);
        }
      })()}
      <Customers />
    </StandalonePage>
  );
}

type AccountUsage = "hobby" | "pro" | "existing-team";

interface SignupFormValues {
  usage: AccountUsage | null;
  name: string;
}

interface SignupFormTransformedValues {
  usage: AccountUsage;
  name: string;
}

function FormStep(props: {
  isFromInvite: boolean;
  onSubmit: SubmitHandler<SignupFormTransformedValues>;
}) {
  const { isFromInvite, onSubmit } = props;
  const [searchParams] = useSearchParams();
  const [defaultUsage] = useState<SignupFormValues["usage"]>(() => {
    if (isFromInvite) {
      return "existing-team";
    }
    const planParam = searchParams.get("plan");
    if (planParam === "hobby" || planParam === "pro") {
      return planParam;
    }
    return null;
  });
  const form = useForm<SignupFormValues, any, SignupFormTransformedValues>({
    defaultValues: {
      usage: defaultUsage,
      name: "",
    },
  });
  const usage = form.watch("usage");
  const isPro = usage === "pro";
  const registerName = form.register("name", {
    required: { value: true, message: "Name is required" },
    minLength: { value: 2, message: "Too short" },
  });
  const nameRef = useObjectRef(registerName.ref);
  useEffect(() => {
    if (usage) {
      nameRef.current?.focus();
    }
  }, [usage, nameRef]);
  return (
    <SignupCard title="The easiest way to catch visual bugs starts with Argos.">
      <Form form={form} onSubmit={onSubmit} className="contents">
        <div className="flex flex-col gap-10">
          {isFromInvite ? null : (
            <AccountTypeField control={form.control} name="usage" />
          )}
          {usage && (
            <div>
              <FormTextInput
                control={form.control}
                label={isPro ? "Team Name" : "Your Name"}
                {...registerName}
                ref={nameRef}
                id="name"
                placeholder={isPro ? "Gryffindor" : "John Wick"}
                autoComplete="off"
              />
              {isPro && <ProPlanWarning />}
            </div>
          )}
          <FormSubmit
            control={form.control}
            size="large"
            className="justify-center"
            disableIfPristine
          >
            Continue
          </FormSubmit>
          <p className="text-low text-center text-xs">
            By joining, you agree to our{" "}
            <Link href="https://argos-ci.com/terms" target="_blank">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="https://argos-ci.com/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </Form>
    </SignupCard>
  );
}

function ProviderStep(props: {
  defaultEmail: string;
  data: SignupFormTransformedValues;
  redirect: string | null;
  isFromInvite: boolean;
}) {
  const { defaultEmail, data, redirect, isFromInvite } = props;
  return (
    <SignupCard title="Let’s create your account">
      <SignupOptions
        defaultEmail={defaultEmail}
        redirect={(() => {
          if (redirect) {
            return redirect;
          }
          switch (data.usage) {
            case "pro":
              // If creating a Pro team, we will not follow the redirect.
              return `/teams/new?name=${encodeURIComponent(data.name)}&autoSubmit=true`;
            case "hobby":
              // In case of hobby, we go to the homepage or the redirect if any.
              return redirect ?? "/";
            case "existing-team": {
              // If coming from an invite, follow the invite redirect.
              if (isFromInvite && redirect) {
                return redirect;
              }
              return "/teams";
            }
            default:
              assertNever(data.usage);
          }
        })()}
      />
    </SignupCard>
  );
}

function Customers() {
  return (
    <div className="mt-10">
      <p className="text-low mb-2 text-center text-sm font-medium">
        Trusted by leading teams
      </p>
      <div className="flex gap-4">
        <img
          src={metaImg}
          alt="Meta"
          className="h-8 opacity-70 brightness-0 dark:invert"
        />
        <img
          src={mermaidImg}
          alt="Mermaid"
          className="h-8 opacity-70 brightness-0 dark:invert"
        />
        <img
          src={muiImg}
          alt="MUI"
          className="h-8 opacity-70 brightness-0 dark:invert"
        />
      </div>
    </div>
  );
}

function SignupCard(props: { title: ReactNode; children: ReactNode }) {
  const { title, children } = props;
  return (
    <Card className="bg-subtle/30 flex max-w-lg flex-col p-10 pt-5">
      <BrandShield className="mb-5 size-12 self-center" />
      <Heading className="mb-10">{title}</Heading>
      {children}
    </Card>
  );
}

export function Component() {
  const loggedIn = useIsLoggedIn();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return <SignupPage />;
}
