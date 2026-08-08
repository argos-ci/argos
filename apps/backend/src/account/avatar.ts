import { invariant } from "@argos/util/invariant";
import { z } from "zod";

import config from "@/config";
import { GithubAccount, User, type Account } from "@/database/models";

const colors = [
  "#2a3b4c",
  "#10418e",
  "#4527a0",
  "#8ca1ee",
  "#65b7d7",
  "#65b793",
  "#00796b",
  "#9c1258",
  "#c20006",
  "#ff3d44",
  "#ffb83d",
  "#f58f00",
];

/**
 * Get a deterministic color based on an id.
 */
export function getAvatarColor(id: string | number): string {
  const randomIndex = Number(id) % colors.length;
  return colors[randomIndex] ?? colors[0] ?? "#000";
}

/**
 * Get a function that returns the GitHub avatar URL for a given login and size.
 */
export function getGitHubAvatarFactory(args: { login: string }) {
  return (props: { size?: number }) => {
    const url = new URL(`https://github.com/${args.login}.png`);
    if (props.size) {
      url.searchParams.set("size", String(props.size));
    }
    return url.toString();
  };
}

const GitLabAvatarResponseSchema = z.object({
  avatar_url: z.url(),
});

/**
 * Get a function that fetches the GitLab avatar URL for a given email and size.
 */
function getGitLabAvatarFactory(args: { email: string }) {
  return async (props: { size?: number }) => {
    const url = new URL("https://gitlab.com/api/v4/avatar");
    url.searchParams.set("email", args.email);
    if (props.size) {
      url.searchParams.set("size", String(props.size));
    }
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const parsed = GitLabAvatarResponseSchema.parse(data);
    return parsed.avatar_url;
  };
}

/**
 * The two entity lookups {@link getAccountAvatar} needs, described structurally
 * so the GraphQL context can pass its own DataLoaders (batching the lookups
 * across a request) while callers outside GraphQL — the public REST API, the
 * invite service — get the direct-query fallback below without depending on the
 * GraphQL layer.
 */
export type AvatarLoaders = {
  GithubAccount: { load: (id: string) => Promise<GithubAccount | null> };
  User: { load: (id: string) => Promise<User | null> };
};

/**
 * Direct-query lookups used when no loaders are supplied. A fresh DataLoader
 * batches nothing on its own, so a caller with a single account to render loses
 * nothing by going straight to the database.
 */
const directLoaders: AvatarLoaders = {
  GithubAccount: {
    load: async (id) => (await GithubAccount.query().findById(id)) ?? null,
  },
  User: {
    load: async (id) => (await User.query().findById(id)) ?? null,
  },
};

/**
 * Get the avatar for an account, either from GitHub, GitLab, or a default initial avatar.
 */
export async function getAccountAvatar(
  account: Account,
  loaders: AvatarLoaders = directLoaders,
) {
  const ghAccount = account.githubAccountId
    ? await loaders.GithubAccount.load(account.githubAccountId)
    : null;

  const firstLetter = account.displayName[0];
  invariant(firstLetter, "Account should have a display name");
  const initial = firstLetter.toUpperCase();
  const color = getAvatarColor(account.id);

  if (ghAccount) {
    return {
      url: getGitHubAvatarFactory({ login: ghAccount.login }),
      initial,
      color,
    };
  }

  if (account.userId) {
    const user = await loaders.User.load(account.userId);
    invariant(user, "User not found");
    if (user.type === "bot") {
      return {
        url: () =>
          new URL(
            "/static/argos-bot.svg?v1",
            config.get("server.url"),
          ).toString(),
        initial,
        color,
      };
    }
    if (user.gitlabUserId && user.email) {
      const email = user.email;
      return {
        url: await getGitLabAvatarFactory({ email }),
        initial,
        color,
      };
    }
  }

  return {
    url: () => null,
    initial,
    color,
  };
}
