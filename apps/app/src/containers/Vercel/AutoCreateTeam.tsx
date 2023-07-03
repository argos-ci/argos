import { useMutation } from "@apollo/client";
import { useEffect } from "react";

import { useQuery } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

import { VercelNoAccountContext } from "./Router";

const VercelTeamQuery = graphql(`
  query Vercel_vercelApiTeam($id: ID!, $accessToken: String!) {
    vercelApiTeam(id: $id, accessToken: $accessToken) {
      id
      name
      slug
    }
  }
`);

const CreateTeamMutation = graphql(`
  mutation Vercel_createTeam($name: String!) {
    createTeam(input: { name: $name }) {
      team {
        id
        slug
      }
    }
  }
`);

export type AutoCreateTeamProps = {
  ctx: VercelNoAccountContext;
};

export const AutoCreateTeam = (props: AutoCreateTeamProps) => {
  const { accessToken, teamId, setLinkedAccount } = props.ctx;
  if (!teamId) {
    throw new Error("Invariant: missing teamId");
  }
  const { data } = useQuery(VercelTeamQuery, {
    variables: { accessToken, id: teamId },
  });
  const [createTeam, createTeamResult] = useMutation(CreateTeamMutation);
  if (createTeamResult.error) {
    throw createTeamResult.error;
  }
  useEffect(() => {
    if (!data) return;
    if (!data.vercelApiTeam) {
      throw new Error("Invariant: vercel team not found");
    }
    const vercelTeamName = data.vercelApiTeam.name || data.vercelApiTeam.slug;
    createTeam({
      variables: { name: `${vercelTeamName} (Vercel)` },
    });
  }, [data, createTeam]);
  const team = createTeamResult.data?.createTeam.team;
  useEffect(() => {
    if (team) {
      setLinkedAccount(team);
    }
  }, [team, setLinkedAccount]);
  return <PageLoader />;
};
