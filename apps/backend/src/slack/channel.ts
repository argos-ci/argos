import { invariant } from "@argos/util/invariant";
import type * as Bolt from "@slack/bolt";
import { z } from "zod";

import { SlackInstallation } from "@/database/models";
import { boom } from "@/util/error";

import { boltApp } from "./app";

export type SlackMessageBlock = Bolt.types.AnyBlock;

/**
 * Post a message to a Slack channel.
 */
export async function postMessageToSlackChannel(args: {
  installation: SlackInstallation;
  channel: string;
  text: string;
  blocks?: SlackMessageBlock[];
}) {
  const { installation, channel, text, blocks } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  await boltApp.client.chat.postMessage({
    token,
    channel,
    text,
    blocks,
    unfurl_links: false,
    unfurl_media: false,
  });
}

const SlackAPIChannel = z.object({
  id: z.string(),
  name: z.string(),
});

type SlackAPIChannel = z.infer<typeof SlackAPIChannel>;

/**
 * Get a Slack channel by its name.
 */
export async function getSlackChannelByName(args: {
  installation: SlackInstallation;
  name: string;
}): Promise<SlackAPIChannel | null> {
  const { installation, name } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  return findChannelByName({ token, name });
}

/**
 * Get a Slack channel by its ID.
 */
export async function getSlackChannelById(args: {
  installation: SlackInstallation;
  id: string;
}): Promise<SlackAPIChannel | null> {
  const { installation, id } = args;
  const token = installation.installation.bot?.token;
  invariant(token, "Expected bot token to be defined");
  const res = await boltApp.client.conversations
    .info({ token, channel: id })
    .catch((error) => {
      const slackErrorCode = getSlackErrorCode(error);
      if (slackErrorCode) {
        switch (slackErrorCode) {
          case "channel_not_found":
            return null;
          default:
            handleSlackError(error);
        }
      }
      throw error;
    });
  if (!res) {
    return null;
  }
  return SlackAPIChannel.parse(res.channel);
}

/**
 * Find a Slack channel by its name recursively in all pages of the channel list.
 */
async function findChannelByName(args: {
  token: string;
  name: string;
}): Promise<SlackAPIChannel | null> {
  const { token } = args;
  const name = normalizeChannelName(args.name);
  let cursor;
  try {
    do {
      const res = await boltApp.client.conversations.list(
        cursor ? { token, cursor } : { token },
      );
      const match = res.channels?.find(
        (c) => c.name === normalizeChannelName(name),
      );
      if (match) {
        return SlackAPIChannel.parse(match);
      }
      cursor = res.response_metadata?.next_cursor;
    } while (cursor);
  } catch (error) {
    handleSlackError(error);
  }
  return null;
}

/**
 * Handle Slack error for common operations.
 */
function handleSlackError(error: unknown) {
  const slackErrorCode = getSlackErrorCode(error);
  if (slackErrorCode) {
    switch (slackErrorCode) {
      case "missing_scope":
        throw boom(
          400,
          "Missing scope in Slack integration. Please reinstall the Argos Slack app in team settings.",
          {
            cause: error,
            code: "MISSING_SLACK_SCOPE",
          },
        );
      default:
        throw error;
    }
  }
  throw error;
}

/**
 * Get the Slack error code from an error object.
 */
function getSlackErrorCode(error: unknown) {
  if (
    error instanceof Error &&
    "data" in error &&
    error.data &&
    typeof error.data === "object" &&
    "error" in error.data &&
    typeof error.data.error === "string"
  ) {
    return error.data.error;
  }
  return null;
}
/**
 * Normalize a Slack channel name by removing the leading `#` and converting to lowercase.
 */
export function normalizeChannelName(channelName: string): string {
  return channelName.replace(/^#/, "").toLowerCase();
}
