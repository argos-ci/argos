import { z } from "zod";

import { redisPubSub } from "@/util/redis";

const presenceChangeSchema = z.object({
  userId: z.string(),
});

export type PresenceChange = z.infer<typeof presenceChangeSchema>;

function getPresenceChannel(userId: string): string {
  return `user-presence-change:${userId}`;
}

/**
 * Publish that a user has become active so every client subscribed to them
 * receives it live. Only the user id travels through Redis; the presence fields
 * (`lastSeenAt`, `timezone`) are re-read per subscriber by the field resolvers.
 */
export async function publishUserPresenceChanged(input: {
  userId: string;
}): Promise<void> {
  await redisPubSub.publish(getPresenceChannel(input.userId), {
    userId: input.userId,
  });
}

/**
 * Yield every presence change published for a user until the iterator is closed
 * (when the GraphQL subscription ends). Each payload is validated before being
 * surfaced (these values come off the wire).
 */
export async function* subscribeToUserPresenceChanges(
  userId: string,
): AsyncGenerator<PresenceChange> {
  const iterator = redisPubSub.subscribe(getPresenceChannel(userId));
  for await (const raw of iterator) {
    yield presenceChangeSchema.parse(raw);
  }
}
