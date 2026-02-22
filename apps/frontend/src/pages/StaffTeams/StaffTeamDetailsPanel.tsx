import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";

import { Table, Tbody, Td, Th, Thead, Tr } from "@/ui/Table";
import { formatNumber } from "@/util/intl";

import { Link } from "../../ui/Link";
import { getProjectURL } from "../Project/ProjectParams";
import {
  getMemberDisplayName,
  getMemberEmailsLabel,
  sortMembersByRoleAndName,
  StaffTeamMembersQuery,
  type TeamMemberItem,
  type TeamProjectItem,
} from "./shared";

function StaffMembersPanel(props: { members: TeamMemberItem[] }) {
  const members = useMemo(
    () => sortMembersByRoleAndName(props.members),
    [props.members],
  );

  if (props.members.length === 0) {
    return <div className="text-low text-sm">No members found.</div>;
  }

  return (
    <Table size="sm">
      <Thead zebra="ui">
        <Tr variant="header" tone="subtle" bordered>
          <Th padding="sm">Member</Th>
          <Th padding="sm">Emails</Th>
          <Th padding="sm" align="right">
            Role
          </Th>
        </Tr>
      </Thead>
      <Tbody zebra="app">
        {members.map((member, index) => {
          const isLast = index === members.length - 1;
          return (
            <Tr key={member.id} bordered={!isLast}>
              <Td padding="sm">
                <div className="truncate font-medium">
                  {getMemberDisplayName(member)}
                </div>
                <div className="text-low truncate">{member.user.slug}</div>
              </Td>
              <Td padding="sm" muted>
                <div className="truncate">{getMemberEmailsLabel(member)}</div>
              </Td>
              <Td padding="sm" align="right" muted>
                {member.level}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}

function StaffProjectsPanel(props: {
  teamSlug: string;
  projects: TeamProjectItem[];
  hasMore: boolean;
}) {
  if (props.projects.length === 0) {
    return <div className="text-low text-sm">No projects found.</div>;
  }

  return (
    <div>
      <Table size="sm">
        <Thead zebra="ui">
          <Tr variant="header" tone="subtle" bordered>
            <Th padding="sm">Project</Th>
            <Th padding="sm" align="right">
              Builds
            </Th>
            <Th padding="sm" align="right">
              Flaky tests (30d)
            </Th>
          </Tr>
        </Thead>
        <Tbody zebra="app">
          {props.projects.map((project, index) => {
            const isLast = index === props.projects.length - 1;
            return (
              <Tr key={project.id} bordered={!isLast}>
                <Td padding="sm">
                  <Link
                    href={getProjectURL({
                      accountSlug: props.teamSlug,
                      projectName: project.name,
                    })}
                    className="block truncate font-medium"
                  >
                    {project.name}
                  </Link>
                </Td>
                <Td padding="sm" align="right" muted numeric>
                  {formatNumber(project.buildsCount)}
                </Td>
                <Td padding="sm" align="right" muted numeric>
                  {formatNumber(project.unstableTestsCount)}
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      {props.hasMore ? (
        <div className="text-low px-1 pt-2 text-xs">
          Showing first 100 projects. Refine data in the team page for full
          list.
        </div>
      ) : null}
    </div>
  );
}

function TeamDetailStatCard(props: { label: string; value: string }) {
  return (
    <div className="bg-app rounded-sm border p-3">
      <div className="text-low text-xs uppercase">{props.label}</div>
      <div className="font-medium tabular-nums">{props.value}</div>
    </div>
  );
}

function StaffTeamDetailsContent(props: {
  teamSlug: string;
  members: TeamMemberItem[];
  projects: TeamProjectItem[];
  projectsCount: number;
  hasMoreProjects: boolean;
  last30DaysScreenshots: number;
}) {
  const {
    members,
    projects,
    projectsCount,
    hasMoreProjects,
    last30DaysScreenshots,
  } = props;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-sm md:grid-cols-3">
        <TeamDetailStatCard
          label="Screenshots (30d)"
          value={formatNumber(last30DaysScreenshots)}
        />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold">
          Projects ({projectsCount})
        </div>
        <StaffProjectsPanel
          teamSlug={props.teamSlug}
          projects={projects}
          hasMore={hasMoreProjects}
        />
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold">
          Members ({members.length})
        </div>
        <StaffMembersPanel members={members} />
      </div>
    </div>
  );
}

export function StaffTeamDetailsPanel(props: {
  teamId: string;
  teamSlug: string;
}) {
  const { data, loading, error } = useQuery(StaffTeamMembersQuery, {
    variables: {
      teamAccountId: props.teamId,
      first: 100,
      after: 0,
    },
  });

  if (error) {
    return (
      <div className="text-danger-low text-sm">
        Failed to load team details.
      </div>
    );
  }

  if (loading) {
    return <div className="text-low text-sm">Loading details…</div>;
  }

  const details = data?.teamById?.__typename === "Team" ? data.teamById : null;
  const members = details?.members.edges ?? [];
  const projects = details?.projects.edges ?? [];

  return (
    <StaffTeamDetailsContent
      teamSlug={props.teamSlug}
      members={members}
      projects={projects}
      projectsCount={details?.projects.pageInfo.totalCount ?? 0}
      hasMoreProjects={Boolean(details?.projects.pageInfo.hasNextPage)}
      last30DaysScreenshots={details?.last30DaysScreenshots ?? 0}
    />
  );
}
