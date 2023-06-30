import { DisclosureContent, useDisclosureState } from "ariakit/disclosure";
import { ElementType, useEffect, useRef, useState } from "react";
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
        I'm working on a team or my project is on a Github organization
      </RadioField>
    </RadioGroup>
  );
};

const SignupPage = () => {
  const [params] = useSearchParams();
  const nameRef = useRef<HTMLInputElement>(null);
  const plan =
    params.get("plan") === "hobby" || params.get("plan") === "pro"
      ? params.get("plan")
      : null;
  const [accountType, setAccountType] = useState<string | null>(plan ?? null);
  const nameDisclosure = useDisclosureState({ open: accountType !== null });
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
        <div className="flex w-[400px] flex-col gap-8">
          <h1 className="mx-auto text-4xl font-medium">Create your Account</h1>

          <AccountTypeSelector value={accountType} setValue={setAccountType} />

          <DisclosureContent state={nameDisclosure}>
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
          </DisclosureContent>

          {name.length > 0 && (
            <LoginButtons
              redirect={
                proAccountSelected
                  ? `/teams/new?name=${encodeURIComponent(name)}`
                  : `/?name=${encodeURIComponent(name)}`
              }
            />
          )}
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
