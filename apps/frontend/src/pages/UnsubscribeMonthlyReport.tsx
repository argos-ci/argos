import { useMutation } from "@apollo/client/react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router";

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
          <title>Unsubscribe from the monthly report</title>
        </Helmet>
        <div className="flex max-w-xl flex-col gap-4 text-center text-balance">
          {token ? <UnsubscribeProcess token={token} /> : <InvalidLink />}
        </div>
      </Container>
    </Layout>
  );
}

function InvalidLink() {
  return (
    <>
      <h2 className="text-3xl font-bold">Invalid unsubscribe link</h2>
      <p className="text-low">
        This unsubscribe link is incomplete. You can turn the monthly report off
        in the billing settings of your team.
      </p>
    </>
  );
}

const UnsubscribeFromMonthlyReportMutation = graphql(`
  mutation UnsubscribeMonthlyReport_unsubscribeFromMonthlyReport(
    $token: String!
  ) {
    unsubscribeFromMonthlyReport(token: $token) {
      teamName
      teamSlug
    }
  }
`);

function UnsubscribeProcess(props: { token: string }) {
  // On a click only: mail scanners open the links of an email by themselves,
  // and must not turn the report off for anyone.
  const [unsubscribe, { data, loading, error }] = useMutation(
    UnsubscribeFromMonthlyReportMutation,
    { variables: { token: props.token } },
  );

  if (data) {
    const { teamName, teamSlug } = data.unsubscribeFromMonthlyReport;
    return (
      <>
        <h2 className="text-3xl font-bold">You are unsubscribed</h2>
        <p className="text-low">
          You will no longer receive the monthly report of{" "}
          <strong>{teamName}</strong>. You can turn it back on in the{" "}
          <Link href={`/${teamSlug}/settings/billing#monthly-report`}>
            billing settings
          </Link>{" "}
          of the team.
        </p>
      </>
    );
  }

  if (
    error &&
    checkIsErrorCode(error, "MONTHLY_REPORT_UNSUBSCRIBE_TOKEN_INVALID")
  ) {
    return (
      <>
        <h2 className="text-3xl font-bold">Unsubscribe link expired</h2>
        <p className="text-low">
          This unsubscribe link has expired or is no longer valid. You can turn
          the monthly report off in the billing settings of your team.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-3xl font-bold">
        Unsubscribe from the monthly report?
      </h2>
      <p className="text-low">
        You will stop receiving the monthly email about your team's activity and
        plan usage. The other owners of the team are not affected.
      </p>
      {error ? (
        <p className="text-danger-low">{getErrorMessage(error)}</p>
      ) : null}
      <div className="mt-6">
        <Button
          variant="primary"
          size="large"
          className="px-14!"
          pending={loading}
          onClick={() => {
            unsubscribe().catch(() => {
              // Errors are surfaced via the `error` state above.
            });
          }}
        >
          Unsubscribe
        </Button>
      </div>
    </>
  );
}
