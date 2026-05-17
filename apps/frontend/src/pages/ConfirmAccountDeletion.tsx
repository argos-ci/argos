import { useMutation } from "@apollo/client/react";
import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";

import { logout } from "@/containers/Auth";
import { Layout } from "@/containers/Layout";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { Link } from "@/ui/Link";
import { checkIsErrorCode, getErrorMessage } from "@/util/error";

export function Component() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return (
    <Layout>
      <Container className="flex flex-1 items-center justify-center">
        <Helmet>
          <title>Confirm Account Deletion</title>
        </Helmet>
        <div className="flex max-w-xl flex-col gap-4 text-center text-balance">
          {token ? <ConfirmProcess token={token} /> : <InvalidLink />}
        </div>
      </Container>
    </Layout>
  );
}

function InvalidLink() {
  return (
    <>
      <h2 className="text-3xl font-bold">Invalid confirmation link</h2>
      <p className="text-low">
        The confirmation link is invalid. To delete your account, please go to
        your <Link href="/">personal settings</Link> and request a new deletion.
      </p>
    </>
  );
}

const ConfirmAccountDeletionMutation = graphql(`
  mutation ConfirmAccountDeletionMutation(
    $input: ConfirmAccountDeletionInput!
  ) {
    confirmAccountDeletion(input: $input)
  }
`);

function ConfirmProcess(props: { token: string }) {
  const navigate = useNavigate();
  const [confirmDeletion, { data, loading, error }] = useMutation(
    ConfirmAccountDeletionMutation,
    {
      variables: { input: { token: props.token } },
    },
  );

  if (data?.confirmAccountDeletion) {
    return (
      <>
        <h2 className="text-3xl font-bold">Account deleted</h2>
        <p className="text-low">
          Your account and all of its contents have been permanently deleted. A
          confirmation email has been sent.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="large"
            onPress={() => {
              logout();
            }}
          >
            Continue
          </Button>
        </div>
      </>
    );
  }

  if (error && checkIsErrorCode(error, "ACCOUNT_DELETION_TOKEN_INVALID")) {
    return (
      <>
        <h2 className="text-3xl font-bold">Confirmation link expired</h2>
        <p className="text-low">
          This account deletion link has expired or has already been used.
          Please go back to your personal settings and request a new account
          deletion.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            size="large"
            onPress={() => {
              navigate("/");
            }}
          >
            Back to settings
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-bold">Confirm account deletion</h2>
      <p className="text-low">
        Click the button below to <strong>permanently delete</strong> your Argos
        account and all of its projects, builds, screenshots and settings. This
        action cannot be undone.
      </p>
      {error ? (
        <p className="text-danger-low">{getErrorMessage(error)}</p>
      ) : null}
      <div className="mt-6">
        <Button
          variant="destructive"
          size="large"
          className="px-14!"
          isPending={loading}
          onPress={() => {
            confirmDeletion().catch(() => {
              // Errors are surfaced via the `error` state above.
            });
          }}
        >
          Delete my account
        </Button>
      </div>
    </>
  );
}
