import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Layout } from "@/containers/Layout";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Code } from "@/ui/Code";
import { Container } from "@/ui/Container";
import { getErrorMessage } from "@/util/error";

/** @route */
export function Component() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  return (
    <Layout>
      <Container className="flex flex-1 items-center justify-center">
        <Helmet>
          <title>Verify Email</title>
        </Helmet>
        <div className="flex max-w-xl flex-col gap-4 text-balance text-center">
          {!email || !token ? (
            <InvalidLink />
          ) : (
            <VerifyProcess email={email} token={token} />
          )}
        </div>
      </Container>
    </Layout>
  );
}

function InvalidLink() {
  return (
    <>
      <h2 className="text-3xl font-bold">Invalid verification link</h2>
      <p className="text-low">
        The verification link is invalid or has expired. Please request a new
        verification email.
      </p>
    </>
  );
}

const VerifyEmailMutation = graphql(`
  mutation VerifyEmailMutation($email: String!, $token: String!) {
    verifyEmail(email: $email, token: $token)
  }
`);

function VerifyProcess(props: { email: string; token: string }) {
  const [verifyEmail, { data, loading }] = useMutation(VerifyEmailMutation, {
    variables: props,
    onError(error) {
      toast.error(getErrorMessage(error));
    },
  });
  if (data) {
    if (data.verifyEmail) {
      return (
        <>
          <h2 className="text-3xl font-bold">Email verified</h2>
          <p className="text-low">
            Your email address was successfully verified.
          </p>
          <p className="text-low">You can now close this page.</p>
        </>
      );
    } else {
      return (
        <>
          <h2 className="text-3xl font-bold">Email verification failed</h2>
          <p className="text-low">
            It looks like you have already clicked this link, or the link has
            expired. Please check if you have already successfully verified your
            email. If you have not, please try again with a new link.
          </p>
          <p className="text-low">You can now close this page.</p>
        </>
      );
    }
  }
  return (
    <>
      <h2 className="text-3xl font-bold">Email verification</h2>
      <p className="text-low">
        To complete the verification process for your email{" "}
        <Code className="!text-base">{props.email}</Code>, please click the
        button below:
      </p>
      <div className="mt-6">
        <Button
          variant="primary"
          size="large"
          className="!px-14"
          isPending={loading}
          onPress={() => {
            verifyEmail().catch(() => {
              // Ignore errors
            });
          }}
        >
          Verify Email
        </Button>
      </div>
    </>
  );
}
