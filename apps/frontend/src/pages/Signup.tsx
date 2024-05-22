import { CSSProperties, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { Container } from "@/ui/Container";
import { Details, Summary } from "@/ui/Details";
import { FormLabel } from "@/ui/FormLabel";
import { RadioField } from "@/ui/Radio";
import { TextInput } from "@/ui/TextInput";

function AccountTypeSelector(props: {
  value: string | null;
  setValue: (value: any) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-orientation="vertical"
      className="flex w-full flex-col justify-start gap-6"
    >
      <RadioField
        label="Hobby"
        value="hobby"
        scale="large"
        checked={props.value === "hobby"}
        onChange={() => props.setValue("hobby")}
      >
        I'm working on personal projects
      </RadioField>
      <RadioField
        label="Pro"
        value="pro"
        scale="large"
        checked={props.value === "pro"}
        onChange={() => props.setValue("pro")}
      >
        I'm building commercial projects
      </RadioField>
    </div>
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

const SignupPage = () => {
  const [params] = useSearchParams();
  const nameRef = useRef<HTMLInputElement>(null);
  const [accountType, setAccountType] = useState<string | null>(() => {
    const planParam = params.get("plan");
    if (planParam === "hobby" || planParam === "pro") {
      return planParam;
    }
    return null;
  });
  const proAccountSelected = accountType === "pro";
  const [name, setName] = useState<string>("");

  useEffect(() => {
    nameRef.current?.focus();
  }, [accountType]);

  return (
    <>
      <Helmet>
        <title>Sign up</title>
      </Helmet>

      <Container className="flex max-w-sm justify-center pt-16">
        <div className="flex max-w-md flex-col gap-8 pb-8">
          <h1
            className="mx-auto mb-8 text-center text-4xl font-bold leading-tight"
            style={{ textWrap: "balance" } as CSSProperties}
          >
            Create your Argos Account
          </h1>

          <AccountTypeSelector value={accountType} setValue={setAccountType} />

          {accountType && (
            <div>
              <FormLabel htmlFor="name">
                {proAccountSelected ? "Team Name" : "Your Name"}
              </FormLabel>
              <TextInput
                ref={nameRef}
                id="name"
                name="name"
                aria-label="name"
                placeholder={proAccountSelected ? "Gryffindor" : "John Wick"}
                value={name}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
              {proAccountSelected && <ProPlanWarning />}
            </div>
          )}

          <LoginButtons
            redirect={
              proAccountSelected
                ? `/teams/new?name=${encodeURIComponent(name)}&autoSubmit=true`
                : "/"
            }
            isDisabled={name.length === 0}
          />
        </div>
      </Container>
    </>
  );
};

/** @route */
export function Component() {
  const loggedIn = useIsLoggedIn();

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return <SignupPage />;
}
