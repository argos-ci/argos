import { ChevronDownIcon, ChevronRightIcon } from "@primer/octicons-react";
import {
  Disclosure,
  DisclosureContent,
  useDisclosureState,
} from "ariakit/disclosure";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { Container } from "@/ui/Container";
import { FormLabel } from "@/ui/FormLabel";
import { RadioField, RadioGroup, useRadioState } from "@/ui/Radio";
import { TextInput } from "@/ui/TextInput";

const AccountTypeSelector = ({
  value,
  setValue,
}: {
  value: string | null;
  setValue: (value: any) => void;
}) => {
  const radio = useRadioState({ value, setValue });

  return (
    <RadioGroup
      state={radio}
      className="flex w-full flex-col justify-start gap-6"
    >
      <RadioField label="Hobby" value="hobby" scale="large">
        I'm working on personal projects
      </RadioField>
      <RadioField label="Pro" value="pro" scale="large">
        I'm building commercial projects
      </RadioField>
    </RadioGroup>
  );
};

const ProPlanWarning = () => {
  const disclosure = useDisclosureState();

  return (
    <div className="mt-4">
      <Disclosure
        state={disclosure}
        className="flex items-center gap-2 text-sm font-medium"
      >
        {disclosure.open ? <ChevronDownIcon /> : <ChevronRightIcon />}Continuing
        will start a 14-day Pro plan trial.
      </Disclosure>
      <DisclosureContent state={disclosure} className="ml-6 mt-2 text-sm">
        Once the trial period ends for your new Argos team, you can continue on
        the Pro plan starting at $30 per month.
      </DisclosureContent>
    </div>
  );
};

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

      <Container className="flex justify-center pt-16">
        <div className="flex max-w-md flex-col gap-8">
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
                ? `/teams/new?name=${encodeURIComponent(name)}`
                : `/?name=${encodeURIComponent(name)}`
            }
            disabled={name.length === 0}
          />
        </div>
      </Container>
    </>
  );
};

export const Signup = () => {
  const loggedIn = useIsLoggedIn();
  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return <SignupPage />;
};
