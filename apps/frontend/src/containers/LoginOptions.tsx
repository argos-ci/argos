import { useState } from "react";
import { useApolloClient } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAtom } from "jotai/react";
import { MailIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { z } from "zod";

import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { GoogleLoginButton } from "@/containers/Google";
import { graphql } from "@/gql";
import { ButtonIcon } from "@/ui/Button";
import { Form } from "@/ui/Form";
import { FormRootToastError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Separator } from "@/ui/Separator";

import { AuthWithEmail } from "./AuthWithEmail";
import { lastLoginMethodAtom, LastUsedIndicator } from "./LastLoginMethod";

type Screen = "providers" | "verifyEmail";

export function LoginOptions(props: {
  redirect?: string | null;
  isDisabled?: boolean;
  className?: string;
  email: string;
  onEmailChange: (email: string) => void;
}) {
  const location = useLocation();
  const { email, onEmailChange } = props;
  const redirect = props.redirect ?? location.pathname + location.search;
  const [screen, setScreen] = useState<Screen>("providers");
  const [lastLoginMethod, setLastLoginMethod] = useAtom(lastLoginMethodAtom);
  switch (screen) {
    case "providers": {
      return (
        <div className="flex w-full flex-col gap-6">
          <EmailForm
            isLastUsed={lastLoginMethod === "email"}
            defaultEmail={email}
            onContinue={({ email }) => {
              onEmailChange(email);
              setScreen("verifyEmail");
            }}
          />
          <Separator />
          <div className="flex flex-col gap-4">
            <LastUsedIndicator isEnabled={lastLoginMethod === "google"}>
              <GoogleLoginButton
                redirect={redirect}
                size="large"
                className="w-full justify-center"
                isDisabled={props.isDisabled}
                onPress={() => setLastLoginMethod("google")}
              >
                Continue with Google
              </GoogleLoginButton>
            </LastUsedIndicator>
            <LastUsedIndicator isEnabled={lastLoginMethod === "github"}>
              <GitHubLoginButton
                redirect={redirect}
                size="large"
                className="w-full justify-center"
                isDisabled={props.isDisabled}
                onPress={() => setLastLoginMethod("github")}
              >
                Continue with GitHub
              </GitHubLoginButton>
            </LastUsedIndicator>
            <LastUsedIndicator isEnabled={lastLoginMethod === "gitlab"}>
              <GitLabLoginButton
                redirect={redirect}
                size="large"
                className="w-full justify-center"
                isDisabled={props.isDisabled}
                onPress={() => setLastLoginMethod("gitlab")}
              >
                Continue with GitLab
              </GitLabLoginButton>
            </LastUsedIndicator>
          </div>
        </div>
      );
    }
    case "verifyEmail": {
      return (
        <div className="flex flex-col items-center gap-8">
          <p className="text-low">
            If you have an account, we have sent a code to{" "}
            <strong>{email}</strong>. Enter it below.
          </p>
          <AuthWithEmail
            email={email}
            onBack={() => setScreen("providers")}
            redirect={redirect}
            onSuccess={() => setLastLoginMethod("email")}
          />
          <Separator />
        </div>
      );
    }
    default:
      assertNever(screen);
  }
}

const RequestLoginFromEmail = graphql(`
  mutation LoginOptions_requestEmailSignin($email: String!) {
    requestEmailSignin(email: $email)
  }
`);

const EmailFormValuesSchema = z.object({
  email: z.email(),
});

function EmailForm(props: {
  defaultEmail: string;
  isLastUsed: boolean;
  onContinue: (data: { email: string }) => void;
}) {
  const { onContinue, isLastUsed, defaultEmail } = props;
  const client = useApolloClient();
  const form = useForm({
    defaultValues: { email: defaultEmail },
    resolver: zodResolver(EmailFormValuesSchema),
  });
  return (
    <Form
      noValidate
      form={form}
      onSubmit={async (data) => {
        await client.mutate({
          mutation: RequestLoginFromEmail,
          variables: { email: data.email },
        });

        onContinue({ email: data.email });
      }}
    >
      <FormRootToastError control={form.control} />
      <LastUsedIndicator isEnabled={isLastUsed}>
        <FormTextInput
          label="Email Address"
          hiddenLabel
          control={form.control}
          scale="lg"
          placeholder="Email Address"
          className="mb-4"
          type="email"
          autoFocus
          {...form.register("email")}
          disabled={form.formState.isSubmitting}
        />
      </LastUsedIndicator>
      <FormSubmit
        control={form.control}
        size="large"
        className="w-full justify-center"
      >
        <ButtonIcon>
          <MailIcon />
        </ButtonIcon>
        Continue with email
      </FormSubmit>
    </Form>
  );
}
