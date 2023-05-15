import { DisclosureContent, useDisclosureState } from "ariakit/disclosure";
import { Radio, RadioGroup, useRadioState } from "ariakit/radio";
import { forwardRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Navigate, useParams, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { LoginButtons } from "@/containers/LoginButtons";
import { Container } from "@/ui/Container";
import { FormLabel } from "@/ui/FormLabel";
import { TextInput } from "@/ui/TextInput";

interface RadioFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: string;
  children: React.ReactNode;
}

export const RadioField = forwardRef<HTMLInputElement, RadioFieldProps>(
  ({ label, value, children, ...props }, ref) => (
    <label className="flex items-baseline gap-4 text-left">
      <Radio ref={ref} value={value} {...props} />
      <div className="border-l border-border px-2 hover:border-on">
        <div className="text-lg font-semibold">{label}</div>
        <p>{children}</p>
      </div>
    </label>
  )
);

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
      <RadioField label="Hobby" value="hobby">
        I'm working on personal projects
      </RadioField>
      <RadioField label="Pro" value="pro">
        I'm working on a team or my project is on a Github organization
      </RadioField>
    </RadioGroup>
  );
};

export const Signup = () => {
  const [params] = useSearchParams();
  const loggedIn = useIsLoggedIn();
  const plan =
    params.get("plan") === "hobby" || params.get("plan") === "pro"
      ? params.get("plan")
      : null;
  const [accountType, setAccountType] = useState<string | null>(plan ?? null);
  const disclosure = useDisclosureState({ open: accountType !== null });
  const proAccountSelected = accountType === "pro";
  const [name, setName] = useState<string>("");

  if (loggedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Sign up</title>
      </Helmet>

      <Container className="mt-16 flex w-[400px] flex-col items-center justify-start">
        <div className="w-[400px]">
          <h1 className="mb-10 text-4xl font-medium">Create your Account</h1>

          <AccountTypeSelector value={accountType} setValue={setAccountType} />

          <div className="mt-6 block h-20">
            <DisclosureContent state={disclosure}>
              <FormLabel htmlFor="name">
                {proAccountSelected ? "Team Name" : "Your Name"}
              </FormLabel>
              <TextInput
                id="name"
                name="name"
                aria-label="name"
                placeholder={proAccountSelected ? "Gryffindor" : "John Wick"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </DisclosureContent>
          </div>

          <div className="mb-2 mt-4 block h-5 text-left text-sm font-medium">
            {proAccountSelected
              ? "Continuing will start a 14-day Pro plan trial."
              : ""}
          </div>
          <LoginButtons
            redirect={
              proAccountSelected
                ? `/teams/new?name=${encodeURIComponent(name)}`
                : `/?name=${encodeURIComponent(name)}`
            }
          />
        </div>
      </Container>
    </>
  );
};
