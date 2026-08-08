import type { QueryBuilder } from "objection";

import { Media } from "@/database/models";

export type MediaFilters = {
  /** Match on the file name or the slug. */
  search?: string | null | undefined;
  /** Restrict to images or to videos. */
  type?: "image" | "video" | null | undefined;
};

/**
 * The media library query, shared by the REST list endpoint and the GraphQL
 * connection so both paginate, filter and order identically.
 *
 * Only media whose bytes landed: a row created for an upload that never completed
 * is an implementation detail of the two-step flow, not something a team should
 * see in its library.
 */
export function queryAccountMedia(args: {
  accountId: string;
  filters: MediaFilters | null;
}): QueryBuilder<Media, Media[]> {
  const query = Media.query()
    .where("media.accountId", args.accountId)
    .whereNotNull("media.uploadedAt")
    .orderBy("media.createdAt", "desc");

  const { search, type } = args.filters ?? {};

  if (search) {
    const pattern = `%${escapeLikePattern(search)}%`;
    query.where((builder) => {
      builder
        .whereILike("media.name", pattern)
        .orWhereILike("media.slug", pattern);
    });
  }

  if (type) {
    query.where(
      "media.mimeType",
      type === "video" ? "like" : "not like",
      "video/%",
    );
  }

  return query;
}

/**
 * Escape the wildcards `LIKE` would otherwise interpret. A search for `100%`
 * should look for that string, not for anything starting with `100`.
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
