import { useQuery } from "@/containers/Apollo";
import { graphql } from "@/gql";
import { PageLoader } from "@/ui/PageLoader";

import { AutoCreateTeam } from "./AutoCreateTeam";
import { ChooseTeam } from "./ChooseTeam";
import type { VercelNoAccountContext } from "./Router";

const TeamsQuery = graphql(`
  query FromTeam_me {
    me {
      id
      teams {
        id
        ...ChooseTeam_Team
      }
    }
  }
`);

export const FromTeam = (props: { ctx: VercelNoAccountContext }) => {
  const { data } = useQuery(TeamsQuery);
  if (!data) {
    return <PageLoader />;
  }
  if (!data.me) {
    throw new Error("Not logged in");
  }
  if (data.me.teams.length > 0) {
    return <ChooseTeam teams={data.me.teams} ctx={props.ctx} />;
  }
  return <AutoCreateTeam ctx={props.ctx} />;
};
