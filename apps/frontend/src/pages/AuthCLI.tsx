import { useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { CheckCircleIcon, TerminalIcon } from "lucide-react";
import { Helmet } from "react-helmet";
import { Navigate, useSearchParams } from "react-router-dom";

import { useIsLoggedIn } from "@/containers/Auth";
import { graphql } from "@/gql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { BrandShield } from "@/ui/BrandShield";
import { Button } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
import { Container } from "@/ui/Container";

import { UserAccessTokenSource } from "../gql/graphql";

const MeQuery = graphql(`
  query AuthCLI_Me {
    me {
      id
      slug
      name
      teams {
        id
        name
        slug
      }
    }
  }
`);

const CreateCLITokenMutation = graphql(`
  mutation AuthCLI_CreateToken($input: CreateUserAccessTokenInput!) {
    createUserAccessToken(input: $input) {
      code
    }
  }
`);

function buildCallbackUrl(port: string, state: string, code: string) {
  return `http://localhost:${port}/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`;
}

function AuthCLIContent(props: {
  port: string;
  state: string;
  codeChallenge: string;
}) {
  const { port, state, codeChallenge } = props;
  const client = useApolloClient();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const { data } = useQuery(MeQuery);
  const me = data?.me;

  async function authorize() {
    if (!me) {
      return;
    }
    setStatus("loading");
    try {
      const accountIds = [me.id, ...me.teams.map((t: { id: string }) => t.id)];
      const result = await client.mutate({
        mutation: CreateCLITokenMutation,
        variables: {
          input: {
            name: "Argos CLI",
            accountIds,
            expireInDays: null,
            source: UserAccessTokenSource.Cli,
            codeChallenge,
          },
        },
      });

      const code = result.data?.createUserAccessToken.code;
      if (!code) {
        setStatus("error");
        return;
      }

      window.location.href = buildCallbackUrl(port, state, code);
    } catch {
      setStatus("error");
    }
  }

  if (status === "error") {
    return (
      <Alert>
        <AlertTitle>Authorization failed</AlertTitle>
        <AlertText>
          Something went wrong while creating your CLI token. Please try again
          or run <code>argos login</code> again.
        </AlertText>
      </Alert>
    );
  }

  const scopeLines = me
    ? [
        `Personal account (@${me.slug})`,
        ...me.teams.map((t) => `Team: ${t.name ?? t.slug}`),
      ]
    : [];

  return (
    <div className="flex flex-col items-center gap-6">
      <BrandShield className="mt-3 w-28" />

      <div className="text-center">
        <h1 className="text-2xl font-semibold">Authorize Argos CLI</h1>
        {me && (
          <p className="text-low mt-1 text-sm">
            Signed in as{" "}
            <span className="text-default font-medium">@{me.slug}</span>
          </p>
        )}
      </div>

      <Card className="w-full">
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="text-low size-4 shrink-0" />
            <span className="text-sm font-medium">
              Argos CLI is requesting access to:
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 pl-6">
            {scopeLines.map((line) => (
              <li key={line} className="flex items-center gap-2 text-sm">
                <CheckCircleIcon className="text-success size-3.5 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="flex w-full flex-col gap-2">
        <Button
          onPress={authorize}
          isDisabled={status === "loading" || !me}
          size="large"
          className="w-full justify-center"
        >
          {status === "loading" ? "Authorizing…" : "Authorize Argos CLI"}
        </Button>
        <p className="text-low text-center text-xs">
          This will create a personal access token stored on your device.
        </p>
      </div>
    </div>
  );
}

const InvalidRequestPage = () => (
  <Container className="mt-12 max-w-sm">
    <Alert>
      <AlertTitle>Invalid request</AlertTitle>
      <AlertText>Missing port or state parameter.</AlertText>
    </Alert>
  </Container>
);

export function Component() {
  const [searchParams] = useSearchParams();
  const isLoggedIn = useIsLoggedIn();
  const port = searchParams.get("port");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("pkce");

  if (!port || !state || !codeChallenge) {
    return <InvalidRequestPage />;
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/login?r=${encodeURIComponent(window.location.href)}`}
        replace
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>Authorize CLI</title>
      </Helmet>
      <Container className="mt-12 max-w-sm px-4">
        <AuthCLIContent
          port={port}
          state={state}
          codeChallenge={codeChallenge}
        />
      </Container>
    </>
  );
}
