import { useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ClockFadingIcon } from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import {
  MediaCommentPins,
  type MediaPoint,
} from "@/containers/Media/MediaCommentPins";
import { getMediaPins, MediaComments } from "@/containers/Media/MediaComments";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { CopyButton } from "@/ui/CopyButton";
import { Link } from "@/ui/Link";
import { MediaImage, MediaVideo, MediaWell } from "@/ui/MediaFrame";
import { formatBytes, formatDimensions, formatExpiry } from "@/util/media";

const MediaShareQuery = graphql(`
  query MediaShare_media(
    $shareToken: String!
    $accountSlug: String!
    $projectName: String!
  ) {
    mediaByShareToken(shareToken: $shareToken) {
      id
      name
      state
      description
      url
      markdown
      permissions
      latestVersion {
        id
        number
        fileUrl
        posterUrl
        contentType
        sizeBytes
        width
        height
        isVideo
        expiresAt
      }
      versions {
        id
        number
        createdAt
      }
      counterpart {
        id
        name
        state
        url
        latestVersion {
          id
          fileUrl
          posterUrl
          width
          height
          isVideo
        }
      }
      project {
        id
        slug
        permissions
      }
      ...MediaComments_Media
    }
  }
`);

type Media = NonNullable<
  DocumentType<typeof MediaShareQuery>["mediaByShareToken"]
>;

/**
 * The public share page: what a reviewer lands on after clicking a screenshot in
 * a pull request comment.
 *
 * Deliberately has no header bar and no page title. The visitor came from a review
 * to see one thing, and every pixel above the media is a pixel of it they cannot
 * see; the identity lands underneath, once they have been served. The file name in
 * monospace is the title.
 *
 * The comment panel appears only when there is something to say or someone able
 * to say it, so an anonymous visitor opening a public link still gets the bare
 * viewer this page was designed as.
 */
export function Component() {
  const { shareToken } = useParams();
  invariant(shareToken, "no share token");

  const roleScope = useCommentRoleScope();
  const { data } = useSuspenseQuery(MediaShareQuery, {
    variables: { shareToken, ...roleScope },
  });

  const media = data.mediaByShareToken;

  if (!media) {
    return <UnavailableState />;
  }

  return (
    <>
      <Helmet>
        <title>{media.name}</title>
        {/* A share page is not a document anyone should find in a search
            result — it is reached from a link, deliberately, and a free tier
            hosting public links is a spam magnet if it is indexable. */}
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <MediaViewer media={media} />
    </>
  );
}

function MediaViewer(props: { media: Media }) {
  const { media } = props;
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const [placing, setPlacing] = useState(false);
  const [draftPoint, setDraftPoint] = useState<MediaPoint | null>(null);

  const version = media.latestVersion;
  const pins = getMediaPins(media.comments);
  const canComment = media.permissions.includes(MediaPermission.Comment);
  // An anonymous visitor on a public link with nothing to read gets the viewer
  // alone — no empty panel narrowing the thing they came to look at.
  const showComments = canComment || media.comments.length > 0;

  const body = (
    <div
      className={clsx(
        "bg-subtle flex min-h-dvh p-4 sm:p-8",
        showComments
          ? "flex-col items-stretch gap-6 lg:flex-row lg:justify-center"
          : "flex-col items-center justify-center",
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 flex-col gap-3",
          showComments ? "w-full lg:max-w-4xl" : "w-full max-w-6xl",
        )}
      >
        <MediaWell
          aspectRatio={
            version.width && version.height
              ? { width: version.width, height: version.height }
              : null
          }
          // The frame is centered over a metadata bar that spans the column, the
          // arrangement every screenshot viewer settles on: the media is the page,
          // and what is known about it reads as a bar beneath rather than as a
          // caption that has to track the frame's edges at every aspect ratio.
          //
          // `self-center` matters beyond the alignment. A stretched column child
          // keeps the container's full width while `max-h` clamps its height,
          // which leaves checkerboard on both sides of the image — the exact
          // confusion the checkerboard exists to signal. Sizing to its content is
          // what lets the aspect ratio hold.
          //
          // The minimum gives a frame to a media whose dimensions processing
          // hasn't recorded yet; the cap keeps a tall screenshot from pushing the
          // metadata and the actions below the fold.
          className="flex max-h-[75dvh] min-h-64 w-auto max-w-full items-center justify-center self-center"
        >
          {version.isVideo ? (
            <MediaVideo src={version.fileUrl} poster={version.posterUrl} />
          ) : (
            <MediaImage src={version.fileUrl} alt={media.name} />
          )}
          {/* The pins sit inside the well, so a percentage position lands on the
              media's own box rather than on the page. */}
          {showComments ? (
            <MediaCommentPins
              pins={pins}
              selectedCommentId={selectedCommentId}
              onSelect={setSelectedCommentId}
              draftPoint={draftPoint}
              placing={placing}
              onPlace={setDraftPoint}
            />
          ) : null}
        </MediaWell>

        <StatusLine media={media} />

        <div className="border-t-thin flex items-center justify-between gap-4 pt-3">
          <Identity projectSlug={media.project?.slug ?? null} />
          <div className="flex items-center gap-2">
            <CopyMarkdownButton markdown={media.markdown} />
            <CopyButton text={media.url} aria-label="Copy link" />
          </div>
        </div>
      </div>

      {showComments ? (
        <aside className="flex min-h-0 w-full flex-col lg:w-96 lg:shrink-0">
          <MediaComments
            media={media}
            pins={pins}
            selectedCommentId={selectedCommentId}
            onSelect={setSelectedCommentId}
            draftPoint={draftPoint}
            placing={placing}
            onPlacingChange={setPlacing}
            onDraftPointChange={setDraftPoint}
          />
        </aside>
      ) : null}
    </div>
  );

  // The comment components ask the project what the viewer may do — reacting is a
  // `review`, same as commenting. An anonymous visitor on a public link is not
  // shown the project at all, so they get no permissions, which is exactly right:
  // they can read the discussion and change nothing.
  return (
    <ProjectPermissionsContext value={media.project?.permissions ?? []}>
      {body}
    </ProjectPermissionsContext>
  );
}

/**
 * The metadata rail: monospace, because every value on it is a value rather than a
 * sentence — a file name, a pixel count, a byte count, a countdown.
 */
function StatusLine(props: { media: Media }) {
  const { media } = props;
  const { latestVersion: version } = media;
  const parts = [
    formatDimensions(version.width, version.height),
    formatBytes(version.sizeBytes),
    // Only worth saying once there is more than one: "v1" on a media nobody has
    // re-uploaded is noise.
    media.versions.length > 1 ? `v${version.number}` : null,
  ].filter((part): part is string => part !== null);

  const expiry = formatExpiry(version.expiresAt);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xs">
      <span className="text-default">{media.name}</span>
      {parts.map((part) => (
        <span key={part} className="text-low">
          <span aria-hidden="true" className="mr-2 opacity-50">
            ·
          </span>
          {part}
        </span>
      ))}
      {expiry ? (
        // A live countdown: neutralized in visual tests so the baseline doesn't
        // change every day, the same way `<Time>` is.
        <span className="text-low" data-visual-test="transparent">
          <span aria-hidden="true" className="mr-2 opacity-50">
            ·
          </span>
          {expiry}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Identity, at caption size and after the media rather than above it. On a page
 * every reviewer of every pull request sees, this is the whole top-of-funnel job —
 * and it does it better by not getting in the way first.
 */
function Identity(props: { projectSlug: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <BrandShield className="size-5 shrink-0" />
      <div className="min-w-0 text-xs">
        <Link href="https://argos-ci.com" target="_blank" external>
          Argos
        </Link>
        {props.projectSlug ? (
          <span className="text-low truncate font-mono">
            <span aria-hidden="true" className="mx-1.5 opacity-50">
              /
            </span>
            {props.projectSlug}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CopyMarkdownButton(props: { markdown: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-low hidden text-xs sm:inline">Markdown</span>
      <CopyButton text={props.markdown} aria-label="Copy Markdown" />
    </div>
  );
}

/**
 * One state for every reason a link stops working — expired, deleted, never
 * finished uploading, or never valid at all.
 *
 * Deliberately does not say which. Telling them apart would let anyone holding a
 * token learn whether it ever pointed at something, and for the person reading it
 * the answer is the same either way.
 */
function UnavailableState() {
  return (
    <div className="bg-subtle flex min-h-dvh flex-col items-center justify-center p-8">
      <Helmet>
        <title>Media unavailable</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="text-low mb-4">
          <ClockFadingIcon className="size-8" strokeWidth={1.5} />
        </div>
        <h1 className="mb-2 text-base font-medium">
          This media is no longer available
        </h1>
        <p className="text-low text-sm text-balance">
          The link has expired, the file was deleted, or you need to be signed
          in to a team that has access to it.
        </p>
        <div className="mt-6 flex items-center gap-2">
          <BrandShield className="size-5" />
          <Link
            href="https://argos-ci.com"
            target="_blank"
            external
            className="text-sm"
          >
            Argos
          </Link>
        </div>
      </div>
    </div>
  );
}
