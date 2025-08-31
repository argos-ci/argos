import { useEffect, useState, type ReactNode } from "react";
import { assertNever } from "@argos/util/assertNever";
import clsx from "clsx";
import { CheckIcon } from "lucide-react";
import { useObjectRef } from "react-aria";
import { Radio, RadioGroup } from "react-aria-components";
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

import { useIsLoggedIn } from "@/containers/Auth";
import { SignupOptions } from "@/containers/SignupOptions";
import { BrandShield } from "@/ui/BrandShield";
import { Card } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Container } from "@/ui/Container";
import { Details, Summary } from "@/ui/Details";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Label } from "@/ui/Label";
import { Link } from "@/ui/Link";

function AccountTypeField<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: {
  name: Path<TFieldValues>;
  control: Control<TFieldValues, TContext, TTransformedValues>;
}) {
  const { control, name } = props;
  const { field } = useController({ control, name });
  return (
    <RadioGroup
      orientation="vertical"
      className="w-full"
      ref={field.ref}
      onChange={field.onChange}
      value={field.value}
      isDisabled={field.disabled}
      onBlur={field.onBlur}
    >
      <Label>Plan Type</Label>
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
            I’m working on commercial projects
            <Chip color="info" scale="sm">
              Pro
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
        "peer flex items-center gap-4 border p-4 text-sm",
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
            <div className="bg-ui m-1 size-3 rounded-full" />
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
        the Pro plan starting at $30 per month.
      </p>
    </Details>
  );
}

function SignupPage() {
  const [step, setStep] = useState<
    | {
        name: "form";
      }
    | { name: "provider"; data: SignupFormTransformedValues }
  >({
    name: "form",
  });
  return (
    <>
      <Helmet>
        <title>Sign up</title>
      </Helmet>

      <Container className="flex justify-center pt-16">
        {(() => {
          switch (step.name) {
            case "form":
              return (
                <FormStep
                  onSubmit={(data) => {
                    setStep({ name: "provider", data });
                  }}
                />
              );
            case "provider": {
              return <ProviderStep data={step.data} />;
            }
            default:
              assertNever(step);
          }
        })()}
      </Container>
    </>
  );
}

type AccountPlan = "hobby" | "pro";

interface SignupFormValues {
  plan: AccountPlan | null;
  name: string;
}

interface SignupFormTransformedValues {
  plan: AccountPlan;
  name: string;
}

function FormStep(props: {
  onSubmit: SubmitHandler<SignupFormTransformedValues>;
}) {
  const { onSubmit } = props;
  const [searchParams] = useSearchParams();
  const [defaultPlan] = useState<SignupFormValues["plan"]>(() => {
    const planParam = searchParams.get("plan");
    if (planParam === "hobby" || planParam === "pro") {
      return planParam;
    }
    return null;
  });
  const form = useForm<SignupFormValues, any, SignupFormTransformedValues>({
    defaultValues: {
      plan: defaultPlan,
      name: "",
    },
  });
  const plan = form.watch("plan");
  const isPro = plan === "pro";
  const registerName = form.register("name", {
    required: { value: true, message: "Name is required" },
    minLength: { value: 2, message: "Too short" },
  });
  const nameRef = useObjectRef(registerName.ref);
  useEffect(() => {
    if (plan) {
      nameRef.current?.focus();
    }
  }, [plan, nameRef]);
  return (
    <SignupCard title="Create your Argos Account">
      <Form form={form} onSubmit={onSubmit} className="contents">
        <AccountTypeField control={form.control} name="plan" />
        {plan && (
          <div className="mt-10">
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
          className="mt-10 justify-center"
          disableIfPristine
        >
          Continue
        </FormSubmit>
        <p className="mt-10 text-center text-xs">
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
      </Form>
    </SignupCard>
  );
}

function ProviderStep(props: { data: SignupFormTransformedValues }) {
  const { data } = props;
  return (
    <SignupCard title="Let’s create your account">
      <SignupOptions
        redirect={
          data.plan === "pro"
            ? `/teams/new?name=${encodeURIComponent(data.name)}&autoSubmit=true`
            : "/"
        }
      />
    </SignupCard>
  );
}

function SignupCard(props: { title: ReactNode; children: ReactNode }) {
  const { title, children } = props;
  return (
    <Card className="flex max-w-lg flex-col p-10">
      <BrandShield className="size-15 mb-2 self-center" />
      <h1 className="mx-auto mb-10 max-w-sm text-balance text-center text-2xl font-semibold leading-tight">
        {title}
      </h1>
      {children}
    </Card>
  );
}

/** @route */
export function Component() {
  const loggedIn = useIsLoggedIn();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return <SignupPage />;
}
