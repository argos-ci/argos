import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ClockFadingIcon } from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { DocumentType, graphql } from "@/gql";
import { BrandShield } from "@/ui/BrandShield";
import { CopyButton } from "@/ui/CopyButton";
import { Link } from "@/ui/Link";
import { MediaImage, MediaVideo, MediaWell } from "@/ui/MediaFrame";
import { formatBytes, formatDimensions, formatExpiry } from "@/util/media";

const MediaShareQuery = graphql(`
  query MediaShare_media($shareToken: String!) {
    mediaByShareToken(shareToken: $shareToken) {
      id
      name
      fileUrl
      posterUrl
      url
      markdown
      contentType
      sizeBytes
      width
      height
      isVideo
      expiresAt
      project {
        id
        slug
      }
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
 */
export function Component() {
  const { shareToken } = useParams();
  invariant(shareToken, "no share token");

  const { data } = useSuspenseQuery(MediaShareQuery, {
    variables: { shareToken },
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

  return (
    <div className="bg-subtle flex min-h-dvh flex-col items-center justify-center p-4 sm:p-8">
      <div className="flex w-full max-w-6xl flex-col gap-3">
        <MediaWell
          aspectRatio={
            media.width && media.height
              ? { width: media.width, height: media.height }
              : null
          }
          // `self-start` does two things. It gives the well an auto width, which
          // is what makes the aspect ratio hold — as a stretched column child it
          // would keep the container's full width while `max-h` clamped its
          // height, leaving checkerboard around the image, the exact confusion
          // the checkerboard exists to prevent. And it aligns the frame's left
          // edge with the metadata rail below it, so the rail reads as a caption
          // for the frame rather than as page furniture.
          //
          // The minimum gives a frame to a media whose dimensions processing
          // hasn't recorded yet; the cap keeps a tall screenshot from pushing the
          // metadata and the actions below the fold.
          className="flex max-h-[75dvh] min-h-64 w-auto max-w-full items-center justify-center self-start"
        >
          {media.isVideo ? (
            <MediaVideo src={media.fileUrl} poster={media.posterUrl} />
          ) : (
            <MediaImage src={media.fileUrl} alt={media.name} />
          )}
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
    </div>
  );
}

/**
 * The metadata rail: monospace, because every value on it is a value rather than a
 * sentence — a file name, a pixel count, a byte count, a countdown.
 */
function StatusLine(props: { media: Media }) {
  const { media } = props;
  const parts = [
    formatDimensions(media.width, media.height),
    formatBytes(media.sizeBytes),
  ].filter((part): part is string => part !== null);

  const expiry = formatExpiry(media.expiresAt);

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
