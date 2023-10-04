import { useMutation } from "@apollo/client";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

import { VercelRouter } from "./Router";

const RetrieveTokenMutation = graphql(`
  mutation Vercel_retrieveVercelToken($code: String!) {
    retrieveVercelToken(code: $code) {
      access_token
      installation_id
      user_id
      team_id
    }
  }
`);

export type RetrieveTokenProps = {
  authUserAccount: {
    id: string;
    slug: string;
  };
};

const useCallbackParams = () => {
  const [params] = useSearchParams();
  const code = params.get("code");
  if (!code) {
    throw new Error("No code provided");
  }

  const next = params.get("next");
  if (!next) {
    throw new Error("No next provided");
  }

  const configurationId = params.get("configurationId");
  if (!configurationId) {
    throw new Error("No configurationId provided");
  }

  const teamId = params.get("teamId") ?? null;
  return { code, next, configurationId, teamId };
};

export const RetrieveToken = (props: RetrieveTokenProps) => {
  const { code, next, configurationId, teamId } = useCallbackParams();

  const [retrieveToken, { data, error }] = useMutation(RetrieveTokenMutation, {
    variables: { code },
  });
  const accessToken =
    window.sessionStorage.getItem("vercelAccessToken") ??
    data?.retrieveVercelToken.access_token;

  useEffect(() => {
    if (!accessToken) {
      retrieveToken().then((result) => {
        const accessToken = result.data?.retrieveVercelToken.access_token;
        if (accessToken) {
          window.sessionStorage.setItem("vercelAccessToken", accessToken);
        }
      });
    }
  }, [retrieveToken, accessToken]);

  if (error) {
    throw error;
  }

  if (!accessToken) {
    return <PageLoader />;
  }

  return (
    <VercelRouter
      accessToken={accessToken}
      configurationId={configurationId}
      teamId={teamId}
      authUserAccount={props.authUserAccount}
      next={next}
    />
  );
};
