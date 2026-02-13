import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import clsx from "clsx";
import { SearchIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Button } from "@/ui/Button";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";

import { getAccountURL } from "./Account/AccountParams";

const StaffTeamsQuery = graphql(`
  query StaffTeams_staffTeams {
    staffTeams {
      id
      createdAt
      slug
      name
      membersCount
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

const StaffTeamMembersQuery = graphql(`
  query StaffTeams_teamMembers(
    $teamAccountId: ID!
    $first: Int!
    $after: Int!
  ) {
    teamById(id: $teamAccountId) {
      id
      ... on Team {
        members(first: $first, after: $after, orderBy: NAME_ASC) {
          pageInfo {
            totalCount
            hasNextPage
          }
          edges {
            id
            level
            user {
              id
              slug
              name
              emails {
                email
                verified
              }
            }
          }
        }
      }
    }
  }
`);

type TeamItem = DocumentType<typeof StaffTeamsQuery>["staffTeams"][number];
type TeamMemberItem = NonNullable<
  Extract<
    DocumentType<typeof StaffTeamMembersQuery>["teamById"],
    { __typename?: "Team" }
  >["members"]
>["edges"][number];

type SortKey = "team" | "createdAt" | "members";

type SortDirection = "asc" | "desc";

function checkTeamMatchesSearch(team: TeamItem, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function SortHeader(props: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = props.activeSortKey === props.sortKey;
  const arrow = isActive ? (props.direction === "asc" ? "↑" : "↓") : "↕";

  return (
    <button
      type="button"
      className={clsx("whitespace-nowrap", props.className)}
      onClick={() => props.onSort(props.sortKey)}
    >
      {props.label} {arrow}
    </button>
  );
}

function StaffMembersPanel(props: { members: TeamMemberItem[] }) {
  if (props.members.length === 0) {
    return <div className="text-low text-sm">No members found.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {props.members.map((member) => (
        <div
          key={member.id}
          className="bg-app grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-sm border p-2 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">
              {member.user.name || member.user.slug}
            </div>
            <div className="text-low truncate">
              {member.user.emails.length > 0
                ? member.user.emails
                    .map((email) =>
                      email.verified
                        ? email.email
                        : `${email.email} (unverified)`,
                    )
                    .join(", ")
                : "No email"}
            </div>
          </div>
          <div className="text-low">{member.level}</div>
        </div>
      ))}
    </div>
  );
}

function StaffTeamRow(props: {
  team: TeamItem;
  index: number;
  isLast: boolean;
  isOpened: boolean;
  toggleMembers: () => void;
}) {
  const { team, index, isLast, isOpened, toggleMembers } = props;
  const teamURL = getAccountURL({ accountSlug: team.slug });
  const membersSettingsURL = `${teamURL}/settings/members`;
  const analyticsURL = `${teamURL}/~/analytics`;
  const {
    data: membersData,
    loading: membersLoading,
    error: membersError,
  } = useQuery(StaffTeamMembersQuery, {
    variables: {
      teamAccountId: team.id,
      first: 100,
      after: 0,
    },
    skip: !isOpened,
  });

  const members =
    membersData?.teamById?.__typename === "Team"
      ? membersData.teamById.members.edges
      : [];

  return (
    <>
      <tr
        className={
          index % 2 === 0
            ? `bg-app ${isLast && !isOpened ? "" : "border-b"}`
            : `bg-subtle ${isLast && !isOpened ? "" : "border-b"}`
        }
      >
        <td className="p-4 text-sm">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar avatar={team.avatar} className="size-8" />
            <div className="min-w-0">
              <div className="truncate font-medium">
                {team.name || team.slug}
              </div>
              <div className="text-low truncate">{team.slug}</div>
            </div>
          </div>
        </td>
        <td className="p-4 text-sm">
          <Time date={team.createdAt} format="ll" tooltip="title" />
        </td>
        <td className="p-4 text-right text-sm tabular-nums">
          {team.membersCount}
        </td>
        <td className="p-4 text-right text-sm">
          <div className="flex items-center justify-end gap-3 whitespace-nowrap">
            <Link href={teamURL}>Team</Link>
            <Link href={membersSettingsURL}>Members</Link>
            <Link href={analyticsURL}>Analytics</Link>
          </div>
        </td>
        <td className="p-4 text-right text-sm">
          <Button variant="secondary" size="small" onPress={toggleMembers}>
            {isOpened ? "Hide members" : "View members"}
          </Button>
        </td>
      </tr>
      {isOpened ? (
        <tr
          className={
            index % 2 === 0
              ? `bg-subtle ${isLast ? "" : "border-b"}`
              : `bg-app ${isLast ? "" : "border-b"}`
          }
        >
          <td colSpan={5} className="border-t px-4 py-3">
            {membersError ? (
              <div className="text-danger-low text-sm">
                Failed to load members.
              </div>
            ) : membersLoading ? (
              <div className="text-low text-sm">Loading members…</div>
            ) : (
              <>
                <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs font-medium">
                  <div>Member / Emails</div>
                  <div>Role</div>
                </div>
                <StaffMembersPanel members={members} />
              </>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function StaffTeamsTable(props: {
  teams: TeamItem[];
  openedTeams: Record<string, boolean>;
  setOpenedTeams: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const {
    teams,
    openedTeams,
    setOpenedTeams,
    sortKey,
    sortDirection,
    onSort,
  } = props;

  return (
    <div className="overflow-x-auto rounded-sm border">
      <table className="w-full min-w-245 table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "15%" }} />
        </colgroup>
        <thead>
          <tr className="text-low border-b text-xs font-semibold">
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Team"
                sortKey="team"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-left"
              />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader
                label="Created"
                sortKey="createdAt"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-left"
              />
            </th>
            <th className="px-4 py-3 text-right">
              <SortHeader
                label="Members"
                sortKey="members"
                activeSortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
            </th>
            <th className="px-4 py-3 text-right">Links</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <StaffTeamRow
              key={team.id}
              team={team}
              index={index}
              isLast={index === teams.length - 1}
              isOpened={Boolean(openedTeams[team.id])}
              toggleMembers={() => {
                setOpenedTeams((state) => ({
                  ...state,
                  [team.id]: !state[team.id],
                }));
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StaffTeamsList() {
  const { data, loading, error } = useQuery(StaffTeamsQuery);
  const [openedTeams, setOpenedTeams] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortKey, setSortKey] = useState<SortKey>("team");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "team" || key === "createdAt" ? "asc" : "desc");
  };

  const filteredAndSortedTeams = useMemo(() => {
    const teams = (data?.staffTeams ?? []).filter((team) =>
      checkTeamMatchesSearch(team, normalizedSearch),
    );

    const directionFactor = sortDirection === "asc" ? 1 : -1;

    teams.sort((a, b) => {
      switch (sortKey) {
        case "team": {
          const left = (a.name || a.slug).toLowerCase();
          const right = (b.name || b.slug).toLowerCase();
          return left.localeCompare(right) * directionFactor;
        }
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            directionFactor
          );
        case "members":
          return (a.membersCount - b.membersCount) * directionFactor;
      }
    });

    return teams;
  }, [
    data?.staffTeams,
    normalizedSearch,
    sortDirection,
    sortKey,
  ]);

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    const isForbidden =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((error) => error.extensions?.code === "FORBIDDEN");

    if (isForbidden) {
      return (
        <Alert>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertText>This page is only available to staff users.</AlertText>
          <AlertText>
            <Link href="/teams">Go to your teams</Link>
          </AlertText>
        </Alert>
      );
    }

    throw error;
  }

  if (!data) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>All Teams</Heading>
          <Text slot="headline">
            Team directory for staff with members, subscriptions, and usage.
          </Text>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <TextInputGroup className="w-72">
            <TextInputIcon>
              <SearchIcon />
            </TextInputIcon>
            <TextInput
              type="search"
              placeholder="Search teams or members…"
              scale="sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </TextInputGroup>
        </PageHeaderActions>
      </PageHeader>
      <StaffTeamsTable
        teams={filteredAndSortedTeams}
        openedTeams={openedTeams}
        setOpenedTeams={setOpenedTeams}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>All Teams</title>
      </Helmet>
      <AuthGuard>{() => <StaffTeamsList />}</AuthGuard>
    </Page>
  );
}
