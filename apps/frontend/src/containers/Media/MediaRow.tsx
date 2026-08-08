import { useApolloClient } from "@apollo/client/react";
import clsx from "clsx";
import { FilmIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Link } from "@/ui/Link";
import { ListRow } from "@/ui/List";
import { MediaWell } from "@/ui/MediaFrame";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { formatBytes, formatDimensions, formatExpiry } from "@/util/media";

const _MediaFragment = graphql(`
  fragment MediaRow_Media on Media {
    id
    name
    slug
    url
    markdown
    fileUrl
    posterUrl
    contentType
    sizeBytes
    width
    height
    isVideo
    status
    expiresAt
    createdAt
    permissions
    project {
      id
      name
    }
  }
`);

type Media = DocumentType<typeof _MediaFragment>;

export function MediaRow(props: { media: Media }) {
  const { media } = props;
  const canDelete = media.permissions.includes(MediaPermission.Delete);

  return (
    <ListRow className="flex items-center gap-4 px-4 py-3">
      <Thumbnail media={media} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={media.url}
          target="_blank"
          // No external indicator: the icon wraps onto its own line in a dense
          // row, and every row here links out — marking each one says nothing.
          external={false}
          className="min-w-0 text-sm font-medium"
        >
          <Truncable>{media.name}</Truncable>
        </Link>
        <div className="text-low text-xxs flex flex-wrap items-baseline gap-x-2 font-mono">
          <MetaParts media={media} />
        </div>
      </div>

      {media.project ? (
        <div className="text-low hidden w-32 shrink-0 truncate text-xs md:block">
          {media.project.name}
        </div>
      ) : null}

      <div className="text-low hidden w-28 shrink-0 text-xs lg:block">
        <Time date={media.createdAt} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip content="Copy Markdown">
          <CopyButton text={media.markdown} aria-label="Copy Markdown" />
        </Tooltip>
        <Tooltip content="Copy link">
          <CopyButton text={media.url} aria-label="Copy link" />
        </Tooltip>
        {canDelete ? <DeleteMediaButton media={media} /> : null}
      </div>
    </ListRow>
  );
}

/**
 * A small version of the share page's inspection surface: same dark ground, same
 * checkerboard, so a thumbnail and the page it links to read as the same object.
 */
function Thumbnail(props: { media: Media }) {
  const { media } = props;
  const previewUrl = media.isVideo ? media.posterUrl : media.fileUrl;

  return (
    <MediaWell
      checkerSize={4}
      className="flex size-12 shrink-0 items-center justify-center"
    >
      {previewUrl ? (
        <img
          src={previewUrl}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        // No preview URL at all: name what the file is rather than showing a
        // broken image.
        <span className="text-white/40">
          {media.isVideo ? (
            <FilmIcon className="size-4" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </span>
      )}
    </MediaWell>
  );
}

function MetaParts(props: { media: Media }) {
  const { media } = props;
  const parts = [
    media.isVideo ? "video" : "image",
    formatDimensions(media.width, media.height),
    formatBytes(media.sizeBytes),
    media.slug,
  ].filter((part): part is string => part !== null);

  const expiry = formatExpiry(media.expiresAt);

  return (
    <>
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? (
            <span aria-hidden="true" className="mr-2 opacity-50">
              ·
            </span>
          ) : null}
          {part}
        </span>
      ))}
      {expiry ? (
        <span
          data-visual-test="transparent"
          className={clsx(
            // An expiry inside a week is the one piece of metadata that changes
            // what somebody does next, so it is the only one that gets colour.
            isExpiringSoon(media.expiresAt) && "text-warning-low",
          )}
        >
          <span aria-hidden="true" className="mr-2 opacity-50">
            ·
          </span>
          {expiry}
        </span>
      ) : null}
    </>
  );
}

const SOON_MS = 7 * 24 * 60 * 60 * 1000;

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() - Date.now() < SOON_MS;
}

const DeleteMediaMutation = graphql(`
  mutation MediaRow_deleteMedia($input: DeleteMediaInput!) {
    deleteMedia(input: $input)
  }
`);

function DeleteMediaButton(props: { media: Media }) {
  return (
    <DialogTrigger>
      <Tooltip content="Delete">
        <Button variant="secondary" size="small" aria-label="Delete media">
          <ButtonIcon>
            <Trash2Icon />
          </ButtonIcon>
        </Button>
      </Tooltip>
      <Modal>
        <DeleteMediaDialog media={props.media} />
      </Modal>
    </DialogTrigger>
  );
}

function DeleteMediaDialog(props: { media: Media }) {
  const { media } = props;
  const client = useApolloClient();
  const state = useOverlayTriggerState();

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Delete “{media.name}”?</DialogTitle>
        <DialogText>
          The file is deleted right away. Any share link or pull request embed
          pointing at it stops working.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          onAction={async () => {
            await client.mutate({
              mutation: DeleteMediaMutation,
              variables: { input: { id: media.id } },
              update: (cache) => {
                const cacheId = cache.identify({
                  __typename: "Media",
                  id: media.id,
                });
                if (cacheId) {
                  cache.evict({ id: cacheId });
                  cache.gc();
                }
              },
            });
            toast.success("Media deleted");
            state.close();
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
