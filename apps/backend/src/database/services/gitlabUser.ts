import type { ExpandedUserSchema } from "@/gitlab";

import { GitlabUser } from "../models/GitlabUser";
import { getPartialModelUpdate } from "../util/update";

export async function getOrCreateGitlabUser(
  apiUser: ExpandedUserSchema,
  options: {
    accessToken: string;
    accessTokenExpiresAt: Date;
    refreshToken: string;
    lastLoggedAt: string;
  },
): Promise<GitlabUser> {
  const existing = await GitlabUser.query().findOne({
    gitlabId: apiUser.id,
  });
  if (existing) {
    const toUpdate = getPartialModelUpdate(existing, {
      name: apiUser.name,
      email: apiUser.email,
      username: apiUser.username,
      lastLoggedAt: options.lastLoggedAt,
    });
    if (toUpdate) {
      return existing.$query().patchAndFetch(toUpdate);
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
    lastLoggedAt: options.lastLoggedAt,
  });
}
