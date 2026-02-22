import type { DocumentType } from "@/gql";
import { graphql } from "@/gql";
import { formatList } from "@/util/intl";

export const StaffTeamsQuery = graphql(`
  query StaffTeams_staffTeams {
    staffTeams {
      id
      createdAt
      slug
      name
      membersCount
      subscriptionStatus
      avatar {
        ...AccountAvatarFragment
      }
    }
  }
`);

export const StaffTeamMembersQuery = graphql(`
  query StaffTeams_teamDetails(
    $teamAccountId: ID!
    $first: Int!
    $after: Int!
  ) {
    teamById(id: $teamAccountId) {
      id
      ... on Team {
        subscriptionStatus
        last30DaysScreenshots
        projects(first: 100, after: 0) {
          pageInfo {
            totalCount
            hasNextPage
          }
          edges {
            id
            name
            buildsCount
            unstableTestsCount(period: LAST_30_DAYS)
          }
        }
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

export type TeamItem = DocumentType<typeof StaffTeamsQuery>["staffTeams"][number];
export type TeamMemberItem = NonNullable<
  Extract<
    DocumentType<typeof StaffTeamMembersQuery>["teamById"],
    { __typename?: "Team" }
  >["members"]
>["edges"][number];
export type TeamProjectItem = NonNullable<
  Extract<
    DocumentType<typeof StaffTeamMembersQuery>["teamById"],
    { __typename?: "Team" }
  >["projects"]
>["edges"][number];

export type SortKey = "team" | "createdAt" | "members";
export type SortDirection = "asc" | "desc";

export const PAGE_SIZE = 100;

const memberLevelRank: Record<TeamMemberItem["level"], number> = {
  owner: 0,
  member: 1,
  contributor: 2,
};

export function getMemberDisplayName(member: TeamMemberItem) {
  return member.user.name || member.user.slug;
}

export function getMemberEmailsLabel(member: TeamMemberItem) {
  if (member.user.emails.length === 0) {
    return "No email";
  }
  return formatList(
    member.user.emails.map((email) =>
      email.verified ? email.email : `${email.email} (unverified)`,
    ),
  );
}

export function sortMembersByRoleAndName(members: TeamMemberItem[]) {
  return members.toSorted((a, b) => {
    const rankDiff = memberLevelRank[a.level] - memberLevelRank[b.level];
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return getMemberDisplayName(a)
      .toLowerCase()
      .localeCompare(getMemberDisplayName(b).toLowerCase());
  });
}

export function checkTeamMatchesSearch(team: TeamItem, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

export function getSubscriptionLabel(status: string | null | undefined) {
  return status ? status.replaceAll("_", " ") : "none";
}
