import type { ExpandedUserSchema } from "@/gitlab/index.js";
import { GitlabUser } from "../models/GitlabUser.js";

export async function getOrCreateGitlabUser(
  apiUser: ExpandedUserSchema,
  options: {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken: string;
  },
): Promise<GitlabUser> {
  const existing = await GitlabUser.query().findOne({
    gitlabId: apiUser.id,
  });
  if (existing) {
    if (
      existing.username !== apiUser.username ||
      existing.email !== apiUser.email ||
      existing.name !== apiUser.name
    ) {
      return existing.$query().patchAndFetch({
        username: apiUser.username,
        email: apiUser.email,
        name: apiUser.name,
      });
    }
    return existing;
  }

  return GitlabUser.query().insertAndFetch({
    gitlabId: apiUser.id,
    username: apiUser.username,
    email: apiUser.email,
    name: apiUser.name,
    accessToken: options.accessToken,
    accessTokenExpiresAt: options.accessTokenExpiresAt.toISOString(),
    refreshToken: options.refreshToken,
  });
}
