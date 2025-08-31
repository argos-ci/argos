import { useSuspenseQuery } from "@apollo/client";
import { PlusCircleIcon } from "lucide-react";
import { Heading } from "react-aria-components";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard, RedirectToWebsite } from "@/containers/AuthGuard";
import { graphql } from "@/gql";
import { StandalonePage } from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { List, ListRowLink } from "@/ui/List";

import { getAccountURL } from "./Account/AccountParams";

const TeamsQuery = graphql(`
  query Teams_me {
    me {
      id
      teams {
        id
        slug
        name
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

function TeamsList() {
  const { data } = useSuspenseQuery(TeamsQuery);
  if (!data.me) {
    return <RedirectToWebsite />;
  }
  return (
    <>
      {data.me.teams.length > 0 ? (
        <>
          <Heading className="mb-6">Your Teams</Heading>
          <List>
            {data.me.teams.map((team) => (
              <ListRowLink
                key={team.id}
                className="flex items-center gap-3 p-4 text-lg"
                href={getAccountURL({ accountSlug: team.slug })}
              >
                <AccountAvatar avatar={team.avatar} className="size-6" />
                {team.name || team.slug}
              </ListRowLink>
            ))}
            <ListRowLink
              className="flex items-center gap-3 p-4 text-lg"
              href="/teams/new"
            >
              <PlusCircleIcon className="size-6" />
              Create a new team
            </ListRowLink>
          </List>
        </>
      ) : (
        <div className="text-center">
          <Heading className="mb-6">You’re not part of any team yet.</Heading>
          <p className="mb-8">
            To join one, ask a team owner to{" "}
            <Link
              href="https://argos-ci.com/docs/faq#how-to-invite-someone-to-my-argos-team"
              target="_blank"
            >
              send you an invite
            </Link>
            .
          </p>
          <p className="mb-1">Or get started now:</p>
          <ul className="space-y-1">
            <li>
              <Link href="/">Go to my personal dashboard</Link>
            </li>
            <li>
              <Link href="/teams/new">Create a new team</Link>
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

/** @route */
export function Component() {
  return (
    <StandalonePage>
      <Helmet>
        <title>Teams</title>
      </Helmet>
      <AuthGuard>
        {() => {
          return (
            <div className="w-full max-w-lg">
              <TeamsList />
            </div>
          );
        }}
      </AuthGuard>
    </StandalonePage>
  );
}
