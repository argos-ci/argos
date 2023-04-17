import { AccountAvatar } from "@/containers/AccountAvatar";
import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import { List, ListRow } from "@/ui/List";

import { TeamNewForm } from "../Team/NewForm";
import type { VercelNoAccountContext } from "./Router";

const TeamFragment = graphql(`
  fragment ChooseTeam_Team on Team {
    id
    name
    slug
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

type ChooseTeamProps = {
  teams: FragmentType<typeof TeamFragment>[];
  ctx: VercelNoAccountContext;
};

export const ChooseTeam = (props: ChooseTeamProps) => {
  const teams = useFragment(TeamFragment, props.teams);
  return (
    <div>
      <p className="mb-6 text-center text-on-light">
        Select an existing Argos team to link your Vercel's one:
      </p>
      <List style={{ maxHeight: 400 }} className="w-full overflow-auto">
        {teams.map((team) => {
          return (
            <ListRow key={team.id} className="px-4 py-2">
              <AccountAvatar
                avatar={team.avatar}
                size={36}
                className="shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold">{team.name}</div>
                </div>
                <div className="text-xs text-slate-500">{team.slug}</div>
              </div>
              <div>
                <Button
                  onClick={() => {
                    props.ctx.setLinkedAccount({
                      id: team.id,
                      slug: team.slug,
                    });
                  }}
                >
                  Continue
                </Button>
              </div>
            </ListRow>
          );
        })}
      </List>
      <p className="my-6 text-center text-on-light">or create a new Team:</p>
      <TeamNewForm
        defaultTeamName=""
        onCreate={(team) => {
          props.ctx.setLinkedAccount({ id: team.id, slug: team.slug });
        }}
      />
    </div>
  );
};
