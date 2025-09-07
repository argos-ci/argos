import { useState } from "react";
import { useApolloClient } from "@apollo/client";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSetAtom } from "jotai/react";
import { MailIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import z from "zod";

import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { GoogleLoginButton } from "@/containers/Google";
import { graphql } from "@/gql";
import { ButtonIcon } from "@/ui/Button";
import { Form } from "@/ui/Form";
import { FormRootToastError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { LinkButton } from "@/ui/Link";

import { AuthWithEmail } from "./AuthWithEmail";
import { lastLoginMethodAtom } from "./LastLoginMethod";

type Screen = "providers" | "email" | "verifyEmail";

export function SignupOptions(props: {
  defaultEmail?: string;
  redirect?: string | null;
}) {
  const location = useLocation();
  const redirect = props.redirect ?? location.pathname + location.search;
  const [email, setEmail] = useState(props.defaultEmail ?? "");
  const [screen, setScreen] = useState<Screen>("providers");
  const setLastLoginMethod = useSetAtom(lastLoginMethodAtom);
  switch (screen) {
    case "providers": {
      return (
        <ProvidersScreen
          redirect={redirect}
          onContinueWithEmail={() => setScreen("email")}
        />
      );
    }
    case "email": {
      return (
        <EmailScreen
          defaultEmail={email}
          onBack={() => setScreen("providers")}
          onContinue={({ email }) => {
            setEmail(email);
            setScreen("verifyEmail");
          }}
        />
      );
    }
    case "verifyEmail": {
      invariant(email, "Expected email to be set");
      return (
        <div className="flex flex-col items-center gap-8">
          <p className="text-low">
            If you don't have an account yet, we have sent a code to{" "}
            <strong>{email}</strong>. Enter it below.
          </p>
          <AuthWithEmail
            email={email}
            onBack={() => setScreen("email")}
            redirect={redirect}
            onSuccess={() => setLastLoginMethod("email")}
          />
        </div>
      );
    }
    default:
      assertNever(screen);
  }
}

const RequestEmailSignupMutation = graphql(`
  mutation SignupOptions_requestEmailSignup($email: String!) {
    requestEmailSignup(email: $email)
  }
`);

const EmailFormValuesSchema = z.object({
  email: z.email(),
});

function EmailScreen(props: {
  defaultEmail: string;
  onBack: () => void;
  onContinue: (data: { email: string }) => void;
}) {
  const { defaultEmail, onBack, onContinue } = props;
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
          mutation: RequestEmailSignupMutation,
          variables: { email: data.email },
        });

        onContinue({ email: data.email });
      }}
    >
      <FormRootToastError control={form.control} />
      <FormTextInput
        label="Work Email"
        control={form.control}
        scale="lg"
        placeholder="tony@stark.com"
        className="mb-4"
        type="email"
        autoFocus
        autoComplete="email"
        {...form.register("email")}
        disabled={form.formState.isSubmitting}
      />
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
      <LinkButton className="mt-6 w-full text-center" onPress={onBack}>
        ← Other Sign Up options
      </LinkButton>
    </Form>
  );
}

function ProvidersScreen(props: {
  redirect?: string | null;
  onContinueWithEmail: () => void;
}) {
  const { redirect, onContinueWithEmail } = props;
  const setLastLoginMethod = useSetAtom(lastLoginMethodAtom);
  return (
    <div className="flex flex-col gap-4">
      <GoogleLoginButton
        redirect={redirect}
        size="large"
        className="w-full justify-center"
        onPress={() => setLastLoginMethod("google")}
      >
        Continue with Google
      </GoogleLoginButton>
      <GitHubLoginButton
        redirect={redirect}
        size="large"
        className="w-full justify-center"
        onPress={() => setLastLoginMethod("github")}
      >
        Continue with GitHub
      </GitHubLoginButton>
      <GitLabLoginButton
        redirect={redirect}
        size="large"
        className="w-full justify-center"
        onPress={() => setLastLoginMethod("gitlab")}
      >
        Continue with GitLab
      </GitLabLoginButton>
      <LinkButton
        className="mt-2 w-full text-center"
        onPress={onContinueWithEmail}
      >
        Continue with Email →
      </LinkButton>
    </div>
  );
}
