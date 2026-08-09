import { useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { ClockFadingIcon, GlobeIcon, LockIcon } from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import type { MediaPoint } from "@/containers/Media/MediaCommentPins";
import { getMediaPins, MediaComments } from "@/containers/Media/MediaComments";
import { MediaVersionPicker } from "@/containers/Media/MediaVersionPicker";
import { MediaViewer } from "@/containers/Media/MediaViewer";
import { NavUserControl } from "@/containers/NavUserControl";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { MediaPermission, MediaVisibility } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Chip } from "@/ui/Chip";
import { CopyButton } from "@/ui/CopyButton";
import { HeadlessLink, Link } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
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
      visibility
      permissions
      latestVersion {
        id
        number
        createdAt
        fileUrl
        downloadUrl
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
        fileUrl
        downloadUrl
        posterUrl
        contentType
        sizeBytes
        width
        height
        isVideo
        expiresAt
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
 * Laid out like the build page — a slim header, the media on the inspection
 * surface, a sidebar of panels — because for a reviewer that *is* the Argos
 * grammar: the same viewer, the same comment cards, the same chrome. The header
 * carries the login control, since commenting is the page's second job and an
 * anonymous visitor needs to see the way in.
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
      <SharePage media={media} />
    </>
  );
}

function SharePage(props: { media: Media }) {
  const { media } = props;
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const [placing, setPlacing] = useState(false);
  const [draftPoint, setDraftPoint] = useState<MediaPoint | null>(null);
  const [versionId, setVersionId] = useState(media.latestVersion.id);

  // Falls back to the latest if the selected version went away under us — a
  // retention purge can take an old one while the page is open.
  const version =
    media.versions.find((candidate) => candidate.id === versionId) ??
    media.latestVersion;

  const pins = getMediaPins(media.comments, version.id);

  // The comment components ask the project what the viewer may do — reacting is a
  // `review`, same as commenting. An anonymous visitor on a public link is not
  // shown the project at all, so they get no permissions, which is exactly right:
  // they can read the discussion and change nothing.
  return (
    <ProjectPermissionsContext value={media.project?.permissions ?? []}>
      <div className="flex min-h-dvh flex-col lg:h-dvh">
        <PageHeader media={media} />
        <div className="bg-subtle flex flex-1 flex-col gap-4 p-4 lg:min-h-0 lg:flex-row">
          <main className="flex min-w-0 flex-col justify-center lg:min-h-0 lg:flex-1">
            <MediaViewer
              media={{ ...media, version }}
              counterpart={
                media.counterpart
                  ? {
                      ...media.counterpart,
                      // Its own newest, not the selected version number: the two
                      // media have independent histories, and "v2 of the after" has
                      // no counterpart "v2 of the before" to line up with.
                      version: media.counterpart.latestVersion,
                    }
                  : null
              }
              pins={pins}
              selectedCommentId={selectedCommentId}
              onSelect={setSelectedCommentId}
              draftPoint={draftPoint}
              placing={placing}
              onPlace={setDraftPoint}
            />
          </main>

          <aside className="flex w-full flex-col gap-3 lg:min-h-0 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
            <SharePanel media={media} version={version} />
            <DetailsPanel
              media={media}
              version={version}
              onSelectVersion={setVersionId}
            />
            <MediaComments
              media={media}
              viewedVersionId={version.id}
              pins={pins}
              selectedCommentId={selectedCommentId}
              onSelect={setSelectedCommentId}
              draftPoint={draftPoint}
              placing={placing}
              onPlacingChange={setPlacing}
              onDraftPointChange={setDraftPoint}
            />
          </aside>
        </div>
        <PageFooter />
      </div>
    </ProjectPermissionsContext>
  );
}

/**
 * The slim bar over the media: what this file is, who may see it, and who you
 * are. The shield leads out to argos-ci.com — on a page every reviewer of every
 * pull request sees, that link is the whole top-of-funnel job — and
 * {@link NavUserControl} is the same login-or-avatar control as the app's, so
 * an anonymous visitor can see the way in to commenting.
 */
function PageHeader(props: { media: Media | null }) {
  const { media } = props;
  return (
    <header className="border-b-thin flex shrink-0 items-center justify-between gap-4 px-4 py-3">
      <div className="flex h-8 min-w-0 items-center gap-3">
        <Tooltip content="What is Argos?">
          <HeadlessLink
            href="https://argos-ci.com"
            target="_blank"
            external={false}
            className="shrink-0 transition hover:brightness-125"
          >
            <BrandShield height={32} />
          </HeadlessLink>
        </Tooltip>
        {media ? (
          <div className="flex min-w-0 flex-col justify-center gap-1">
            {/* The file name is the page's title, in monospace because it is a
                value, not a sentence. */}
            <h1 className="truncate font-mono text-sm leading-none font-medium">
              {media.name}
            </h1>
            {media.project ? (
              // Only viewers who could reach the project anyway get it named —
              // the resolver hides it from everyone else.
              <HeadlessLink
                href={`/${media.project.slug}`}
                className="text-low data-hovered:text-default rac-focus truncate text-xs leading-none transition"
              >
                {media.project.slug}
              </HeadlessLink>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {media ? <VisibilityChip visibility={media.visibility} /> : null}
        <NavUserControl />
      </div>
    </header>
  );
}

/**
 * Who can open this link. The answer matters most at the moment of forwarding
 * it — pasting a "team only" URL into a public issue silently shows nothing.
 */
function VisibilityChip(props: { visibility: MediaVisibility }) {
  switch (props.visibility) {
    case MediaVisibility.Public:
      return (
        <Tooltip content="Anyone with the link can view this media">
          <Chip
            scale="xs"
            color="neutral"
            icon={GlobeIcon}
            className="max-sm:hidden"
          >
            Public link
          </Chip>
        </Tooltip>
      );
    case MediaVisibility.Team:
      return (
        <Tooltip content="Only members of the team can view this media">
          <Chip
            scale="xs"
            color="neutral"
            icon={LockIcon}
            className="max-sm:hidden"
          >
            Team only
          </Chip>
        </Tooltip>
      );
  }
}

/**
 * The tiny footer: one line saying whose infrastructure served the page. The
 * header's shield is an icon; this is where the name is spelled out for a
 * visitor who has never seen it.
 */
function PageFooter() {
  return (
    <footer className="border-t-thin text-low flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs">
      <BrandShield className="size-4 shrink-0" />
      <span className="min-w-0 truncate">
        Hosted by{" "}
        <Link
          href="https://argos-ci.com"
          target="_blank"
          external={false}
          className="font-medium"
        >
          Argos
        </Link>
        <span aria-hidden="true" className="mx-1.5 opacity-60">
          ·
        </span>
        Visual testing for your pull requests
      </span>
    </footer>
  );
}

/**
 * Everything needed to pass the media along: the share URL, the Markdown embed
 * ready to paste into a pull request, and the raw bytes.
 */
function SharePanel(props: {
  media: Media;
  version: Media["versions"][number];
}) {
  const { media, version } = props;
  const canDownload = media.permissions.includes(MediaPermission.View);
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Share</PanelTitle>
      </PanelHeader>
      <div className="flex flex-col gap-3 px-4">
        <CopyRow label="Link" value={media.url} />
        <CopyRow label="Markdown" value={media.markdown} />
        {canDownload ? (
          <div className="flex items-center gap-4 text-xs">
            <Link href={version.fileUrl} target="_blank">
              Open original
            </Link>
            <Link href={version.downloadUrl} external={false}>
              Download
            </Link>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

/**
 * One labelled, copyable value: the text shown so the reader knows what they are
 * about to paste, the button so they never have to select it by hand.
 */
function CopyRow(props: { label: string; value: string }) {
  const { label, value } = props;
  return (
    <div className="flex flex-col gap-1">
      <div className="text-low text-xs">{label}</div>
      <div className="border-thin bg-subtle flex items-center gap-1.5 rounded-md p-1 pl-2.5">
        <code className="text-default min-w-0 flex-1 truncate font-mono text-xs">
          {value}
        </code>
        <CopyButton
          text={value}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="shrink-0"
        />
      </div>
    </div>
  );
}

/**
 * The facts of the selected version, as labelled monospace values — a file
 * listing, not prose.
 */
function DetailsPanel(props: {
  media: Media;
  version: Media["versions"][number];
  onSelectVersion: (versionId: string) => void;
}) {
  const { media, version, onSelectVersion } = props;
  const dimensions = formatDimensions(version.width, version.height);
  const expiry = formatExpiry(version.expiresAt);
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Details</PanelTitle>
      </PanelHeader>
      <div className="flex flex-col gap-3 px-4">
        {media.description ? (
          <p className="text-sm">{media.description}</p>
        ) : null}
        <dl className="flex flex-col gap-1.5">
          <DetailRow label="Uploaded">
            <Time date={version.createdAt} className="text-default" />
          </DetailRow>
          {dimensions ? (
            <DetailRow label="Dimensions" mono>
              {dimensions}
            </DetailRow>
          ) : null}
          <DetailRow label="Size" mono>
            {formatBytes(version.sizeBytes)}
          </DetailRow>
          {media.state && !media.counterpart ? (
            // Which half of a pair this is. With both halves on the page the
            // panes label themselves; alone, the label lives here.
            <DetailRow label="State" mono>
              {media.state}
            </DetailRow>
          ) : null}
          {expiry ? (
            <DetailRow label="Expires" mono>
              {/* A live countdown: neutralized in visual tests so the baseline
                  doesn't change every day, the same way `<Time>` is. */}
              <span data-visual-test="transparent">{expiry}</span>
            </DetailRow>
          ) : null}
        </dl>
        <MediaVersionPicker
          versions={media.versions}
          selectedId={version.id}
          onSelect={onSelectVersion}
        />
      </div>
    </Panel>
  );
}

function DetailRow(props: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  const { label, children, mono = false } = props;
  return (
    <div className="flex items-baseline justify-between gap-4 text-xs">
      <dt className="text-low shrink-0">{label}</dt>
      <dd
        className={clsx(
          "text-default min-w-0 truncate text-right",
          mono && "font-mono",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * One state for every reason a link stops working — expired, deleted, never
 * finished uploading, or never valid at all.
 *
 * Deliberately does not say which. Telling them apart would let anyone holding a
 * token learn whether it ever pointed at something, and for the person reading it
 * the answer is the same either way. The header keeps its login control: for a
 * team-only media, signing in *is* the fix.
 */
function UnavailableState() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Helmet>
        <title>Media unavailable</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PageHeader media={null} />
      <div className="bg-subtle flex flex-1 flex-col items-center justify-center p-8">
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
        </div>
      </div>
      <PageFooter />
    </div>
  );
}
