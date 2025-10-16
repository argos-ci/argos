import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import {
  Account,
  GithubAccount,
  GithubAccountMember,
  GithubRepository,
  TeamUser,
} from "@/database/models/index.js";
import { checkErrorStatus, getTokenOctokit, Octokit } from "@/github/index.js";

import { notFound } from "../util";

const OwnerTypeSchema = z.enum(["user", "organization"]);

/**
 * Synchronize GitHub members with the database.
 */
async function syncGithubMembers(input: {
  githubAccountId: string;
  githubMemberIds: string[];
}) {
  const { githubAccountId, githubMemberIds } = input;
  const existingGitHubMembers = await GithubAccountMember.query()
    .select("githubMemberId")
    .where("githubAccountId", githubAccountId);
  const existingGithubMemberIds = existingGitHubMembers.map(
    (member) => member.githubMemberId,
  );
  const newMemberInputs = githubMemberIds
    .filter((id) => !existingGithubMemberIds.includes(id))
    .map((id) => {
      return {
        githubAccountId,
        githubMemberId: id,
      };
    });
  const removedMemberIds = existingGithubMemberIds
    .filter((id) => !githubMemberIds.includes(id))
    .map((id) => id);
  await Promise.all([
    newMemberInputs.length > 0
      ? GithubAccountMember.query().insert(newMemberInputs)
      : null,
    removedMemberIds.length > 0
      ? GithubAccountMember.query()
          .delete()
          .where("githubAccountId", githubAccountId)
          .whereIn("githubMemberId", removedMemberIds)
      : null,
  ]);
}

/**
 * Get missing team members from a list of GitHub account IDs.
 */
async function getMissingTeamMembers(input: {
  teamId: string;
  githubAccountIds: string[];
}) {
  const { teamId, githubAccountIds } = input;
  const memberAccounts = await Account.query()
    .select("userId")
    .whereNotNull("userId")
    .whereIn("githubAccountId", githubAccountIds);

  const accountUserIds = memberAccounts.map((account) => {
    invariant(account.userId);
    return account.userId;
  });
  const existingTeamUsers = await TeamUser.query()
    .where("teamId", teamId)
    .whereIn("userId", accountUserIds);
  const existingUserIds = existingTeamUsers.map(
    (teamMember) => teamMember.userId,
  );
  const newTeamMemberInputs = accountUserIds
    .filter((userId) => !existingUserIds.includes(userId))
    .map((userId) => {
      return {
        userId,
        teamId,
        userLevel: "member" as const,
      };
    });

  return newTeamMemberInputs;
}

/**
 * Import GitHub organization members into a team.
 */
export async function importOrgMembers(input: {
  org: string;
  octokit: Octokit;
  teamId: string;
  githubAccount: GithubAccount;
}) {
  const { org, octokit, teamId } = input;
  const members = await octokit.paginate(octokit.orgs.listMembers, { org });
  if (!members.length) {
    return [];
  }
  const memberGithubAccounts = await getOrCreateGitHubAccounts(members);
  const memberGithubAccountIds = memberGithubAccounts.map((a) => a.id);
  const [missingTeamMembers] = await Promise.all([
    getMissingTeamMembers({
      teamId,
      githubAccountIds: memberGithubAccountIds,
    }),
    syncGithubMembers({
      githubAccountId: input.githubAccount.id,
      githubMemberIds: memberGithubAccountIds,
    }),
  ]);

  return missingTeamMembers;
}

/**
 * Check if a user has access to a GitHub Installation.
 */
export async function checkUserHasAccessToInstallation(
  userAccount: Account,
  ghInstallationId: number,
) {
  if (!userAccount.githubAccountId) {
    return false;
  }
  const githubAccount = await userAccount.$relatedQuery("githubAccount");
  if (!githubAccount.accessToken) {
    return false;
  }
  const octokit = getTokenOctokit({
    token: githubAccount.accessToken,
    proxy: false,
  });
  const result = await octokit.paginate(
    octokit.apps.listInstallationsForAuthenticatedUser,
  );
  return result.some((installation) => installation.id === ghInstallationId);
}

type CreateGitHubAccountInput = {
  id: number;
  login: string;
  type: string;
  name?: string | null | undefined;
};

async function getOrCreateGitHubAccounts(
  inputs: CreateGitHubAccountInput[],
): Promise<GithubAccount[]> {
  const githubIds = inputs.map((input) => input.id);
  const existingAccounts = await GithubAccount.query().whereIn(
    "githubId",
    githubIds,
  );
  const existingIds = existingAccounts.map((account) => account.githubId);
  const newAccountInputs = inputs
    .filter((input) => !existingIds.includes(input.id))
    .map((input) => {
      const type = OwnerTypeSchema.parse(input.type.toLowerCase());
      return {
        githubId: input.id,
        login: input.login,
        type,
        name: input.name ?? null,
      };
    });
  const newAccounts =
    newAccountInputs.length > 0
      ? await GithubAccount.query().insertAndFetch(newAccountInputs)
      : [];
  return inputs.map((input) => {
    const account =
      existingAccounts.find((account) => account.githubId === input.id) ??
      newAccounts.find((account) => account.githubId === input.id);
    invariant(account, "Account not found");
    return account;
  });
}

export async function getOrCreateGithubAccount(
  input: CreateGitHubAccountInput,
) {
  const [account] = await getOrCreateGitHubAccounts([input]);
  invariant(account, "Account not found");
  return account;
}

export async function getOrCreateGithubRepository(args: {
  octokit: Octokit;
  repo: string;
  owner: string;
}): Promise<GithubRepository> {
  const ghApiRepo = await args.octokit.repos
    .get({
      owner: args.owner,
      repo: args.repo,
    })
    .then((res) => res.data)
    .catch((error: unknown) => {
      if (checkErrorStatus(404, error)) {
        return null;
      }
      throw error;
    });

  if (!ghApiRepo) {
    throw notFound(`GitHub repository not found: ${args.owner}/${args.repo}`);
  }

  const githubAccount = await getOrCreateGithubAccount(ghApiRepo.owner);

  const repo = await GithubRepository.query().findOne({
    githubId: ghApiRepo.id,
  });

  if (repo) {
    return repo;
  }

  return GithubRepository.query().insertAndFetch({
    githubId: ghApiRepo.id,
    name: ghApiRepo.name,
    private: ghApiRepo.private,
    defaultBranch: ghApiRepo.default_branch,
    githubAccountId: githubAccount.id,
  });
}
