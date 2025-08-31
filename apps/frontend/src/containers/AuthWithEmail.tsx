import { useState } from "react";
import { useMutation } from "@apollo/client";
import { AlertCircleIcon } from "lucide-react";

import { graphql } from "@/gql";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { LinkButton } from "@/ui/Link";
import { Loader } from "@/ui/Loader";
import { OTPInput } from "@/ui/OTPInput";
import { checkIsErrorCode, getErrorMessage } from "@/util/error";

import { useAuth } from "./Auth";

const AuthenticateWithEmailMutation = graphql(`
  mutation AuthWithEmail_authenticateWithEmail(
    $email: String!
    $code: String!
  ) {
    authenticateWithEmail(input: { email: $email, code: $code }) {
      jwt
      creation
    }
  }
`);

export function AuthWithEmail(props: {
  email: string;
  onBack: () => void;
  redirect: string | undefined;
}) {
  const { email, onBack, redirect } = props;
  const { setToken } = useAuth();
  const [authenticateWithEmail, { loading, error }] = useMutation(
    AuthenticateWithEmailMutation,
    {
      onCompleted: (data) => {
        if (data.authenticateWithEmail.creation && redirect) {
          setToken(data.authenticateWithEmail.jwt, {
            silent: true,
          });
          window.location.replace(redirect);
        } else {
          setToken(data.authenticateWithEmail.jwt);
        }
      },
    },
  );
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col items-center">
      <OTPInput
        className="mb-6"
        autoFocus
        aria-invalid={error ? "true" : undefined}
        value={code}
        onChange={setCode}
        onComplete={() => {
          authenticateWithEmail({
            variables: { email, code },
          }).catch(() => {});
        }}
      />
      {error ? (
        <ErrorMessage className="mb-4">
          <div className="flex items-start gap-2">
            <AlertCircleIcon className="size-5" />
            {checkIsErrorCode(error, "INVALID_EMAIL_VERIFICATION_CODE")
              ? "The entered code is incorrect. Please try again and check for typos."
              : getErrorMessage(error)}
          </div>
        </ErrorMessage>
      ) : null}
      <div>
        {loading ? (
          <div className="text-low flex items-center gap-2">
            <Loader delay={0} className="size-5" />
            Verifying…
          </div>
        ) : (
          <LinkButton className="w-full text-center" onPress={onBack}>
            ← Back
          </LinkButton>
        )}
      </div>
    </div>
  );
}
