import type { Dispatch, SetStateAction } from "react";
import clsx from "clsx";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { Button } from "@/ui/Button";
import { Link } from "@/ui/Link";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/ui/Table";
import { Time } from "@/ui/Time";

import { getAccountURL } from "../Account/AccountParams";
import { StaffTeamDetailsPanel } from "./StaffTeamDetailsPanel";
import {
  type SortDirection,
  type SortKey,
  type TeamItem,
  getSubscriptionLabel,
} from "./shared";

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

function TeamLinks(props: {
  teamURL: string;
  membersSettingsURL: string;
  analyticsURL: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
      <Link href={props.teamURL}>Team</Link>
      <Link href={props.membersSettingsURL}>Members</Link>
      <Link href={props.analyticsURL}>Analytics</Link>
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

  return (
    <>
      <Tr tone={index % 2 === 0 ? "app" : "subtle"} bordered={!isLast || isOpened}>
        <Td padding="md" size="sm">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar avatar={team.avatar} className="size-8" />
            <div className="min-w-0">
              <div className="truncate font-medium">{team.name || team.slug}</div>
              <div className="text-low truncate">{team.slug}</div>
            </div>
          </div>
        </Td>
        <Td padding="md" size="sm">
          <Time date={team.createdAt} format="ll" tooltip="title" />
        </Td>
        <Td padding="md" size="sm">
          {getSubscriptionLabel(team.subscriptionStatus)}
        </Td>
        <Td padding="md" align="right" size="sm" className="tabular-nums">
          {team.membersCount}
        </Td>
        <Td padding="md" align="right" size="sm">
          <TeamLinks
            teamURL={teamURL}
            membersSettingsURL={membersSettingsURL}
            analyticsURL={analyticsURL}
          />
        </Td>
        <Td padding="md" align="right" size="sm">
          <Button variant="secondary" size="small" onPress={toggleMembers}>
            {isOpened ? "Hide details" : "View details"}
          </Button>
        </Td>
      </Tr>
      {isOpened ? (
        <Tr tone={index % 2 === 0 ? "subtle" : "app"} bordered={!isLast}>
          <Td colSpan={6} padding="md" className="border-t">
            <StaffTeamDetailsPanel teamId={team.id} teamSlug={team.slug} />
          </Td>
        </Tr>
      ) : null}
    </>
  );
}

export function StaffTeamsTable(props: {
  teams: TeamItem[];
  openedTeams: Record<string, boolean>;
  setOpenedTeams: Dispatch<SetStateAction<Record<string, boolean>>>;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const { teams, openedTeams, setOpenedTeams, sortKey, sortDirection, onSort } =
    props;

  return (
    <Table>
      <Thead>
        <Tr variant="header" bordered>
          <Th>
            <SortHeader
              label="Team"
              sortKey="team"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="text-left"
            />
          </Th>
          <Th>
            <SortHeader
              label="Created"
              sortKey="createdAt"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="text-left"
            />
          </Th>
          <Th>Subscription</Th>
          <Th align="right">
            <SortHeader
              label="Members"
              sortKey="members"
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
              className="text-right"
            />
          </Th>
          <Th align="right">Links</Th>
          <Th align="right">Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
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
      </Tbody>
    </Table>
  );
}
