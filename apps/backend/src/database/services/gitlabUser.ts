import { invariant } from "@argos/util/invariant";

import type { ExpandedUserSchema } from "@/gitlab";

import { GitlabUser } from "../models/GitlabUser";

export async function getOrCreateGitlabUser(
  apiUser: ExpandedUserSchema,
  options: {
    baseUrl: string;
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken: string;
    lastLoggedAt: string;
  },
): Promise<GitlabUser> {
  const [gitlabUser] = await GitlabUser.query()
    .insert([
      {
        baseUrl: options.baseUrl,
        gitlabId: apiUser.id,
        username: apiUser.username,
        email: apiUser.email,
        name: apiUser.name,
        accessToken: options.accessToken,
        accessTokenExpiresAt: options.accessTokenExpiresAt.toISOString(),
        refreshToken: options.refreshToken,
        lastLoggedAt: options.lastLoggedAt,
      },
    ])
    .onConflict(["baseUrl", "gitlabId"])
    .merge(["name", "email", "username", "lastLoggedAt", "updatedAt"])
    .returning("*");
  invariant(gitlabUser, "Failed to upsert GitLab user");
  return gitlabUser;
}
