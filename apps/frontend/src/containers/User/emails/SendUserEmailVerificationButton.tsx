import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { getErrorMessage } from "@/util/error";

type SendUserEmailVerificationButtonProps = {
  email: string;
};

const SendUserEmailVerificationMutation = graphql(`
  mutation SendUserEmailVerificationMutation($email: String!) {
    sendUserEmailVerification(email: $email) {
      id
      emails {
        verified
        email
      }
    }
  }
`);

export function SendUserEmailVerificationButton(
  props: SendUserEmailVerificationButtonProps,
) {
  const [sendUserEmailVerification, { loading }] = useMutation(
    SendUserEmailVerificationMutation,
    {
      variables: { email: props.email },
      onCompleted: () => {
        toast.success("Verification email sent", {
          description: (
            <>
              Follow the verification link sent to{" "}
              <strong>{props.email}</strong> to continue.
            </>
          ),
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    },
  );
  return (
    <Button
      variant="secondary"
      isPending={loading}
      onPress={() => {
        sendUserEmailVerification().catch(() => {
          // Ignore error here
        });
      }}
    >
      Resend verification email
    </Button>
  );
}
