import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
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
import { Button, ButtonIcon } from "@/ui/Button";
import { Form } from "@/ui/Form";
import { FormRootToastError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Separator } from "@/ui/Separator";

import { AuthWithEmail } from "./AuthWithEmail";
import { lastLoginMethodAtom, LastUsedIndicator } from "./LastLoginMethod";

type Screen = "providers" | "verifyEmail" | "saml";

export function LoginOptions(props: {
  redirect?: string | null;
  isDisabled?: boolean;
  className?: string;
  email: string;
  onEmailChange: (email: string) => void;
  onSamlLogin: (teamSlug: string) => void;
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
            <Button
              variant="secondary"
              size="large"
              className="w-full justify-center"
              isDisabled={props.isDisabled}
              onPress={() => setScreen("saml")}
            >
              Continue with SAML SSO
            </Button>
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
    case "saml": {
      return (
        <div className="flex w-full flex-col gap-6">
          <SamlForm
            onBack={() => setScreen("providers")}
            onSubmit={(teamSlug) => props.onSamlLogin(teamSlug)}
          />
        </div>
      );
    }
    default:
      assertNever(screen);
  }
}

const TeamSlugSchema = z.object({
  teamSlug: z
    .string()
    .trim()
    .min(1, "Please enter your team slug")
    .regex(/^[a-z0-9-]+$/i, "Team slug can only include letters, digits and -"),
});

type SamlFormValues = z.infer<typeof TeamSlugSchema>;

function SamlForm(props: {
  onSubmit: (teamSlug: string) => void;
  onBack: () => void;
}) {
  const form = useForm<SamlFormValues>({
    defaultValues: { teamSlug: "" },
    resolver: zodResolver(TeamSlugSchema),
  });
  return (
    <Form
      form={form}
      onSubmit={async (data) => {
        props.onSubmit(data.teamSlug.trim());
      }}
    >
      <FormRootToastError control={form.control} />
      <FormTextInput
        label="Team slug"
        control={form.control}
        scale="lg"
        placeholder="team-slug"
        className="mb-4"
        autoFocus
        {...form.register("teamSlug")}
        disabled={form.formState.isSubmitting}
      />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 justify-center"
          onPress={props.onBack}
          type="button"
        >
          Back
        </Button>
        <FormSubmit
          control={form.control}
          size="large"
          className="flex-1 justify-center"
        >
          Continue
        </FormSubmit>
      </div>
    </Form>
  );
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
          autoComplete="email"
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
