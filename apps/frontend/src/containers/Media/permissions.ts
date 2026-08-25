import { MediaPermission } from "@/gql/graphql";

/**
 * Whether the viewer may add to a media's discussion.
 *
 * One question behind three controls — the panel's composer, the pin layer and
 * the toolbar's comment tool — so none of them can be offered over a surface
 * that would reject what it writes.
 */
export function checkCanCommentOnMedia(media: {
  permissions: MediaPermission[];
}): boolean {
  return media.permissions.includes(MediaPermission.Comment);
}
