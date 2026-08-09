import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import {
  ClockFadingIcon,
  DownloadIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LockIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import {
  downloadBlob,
  downloadWithToast,
  fetchBlob,
} from "@/containers/Build/ScreenshotActions";
import { MentionableUsersProvider } from "@/containers/Comment/MentionableUsersContext";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { MediaComments } from "@/containers/Media/MediaComments";
import { MediaVersionPicker } from "@/containers/Media/MediaVersionPicker";
import {
  getMediaDownloadName,
  MediaViewer,
} from "@/containers/Media/MediaViewer";
import { NavUserControl } from "@/containers/NavUserControl";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { MediaVisibility } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { CopyButton } from "@/ui/CopyButton";
import { HeadlessLink, Link } from "@/ui/Link";
import { ListBox, ListBoxItem, ListBoxItemLabel } from "@/ui/ListBox";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton, SelectValue } from "@/ui/Select";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { getMentionUser } from "@/ui/UserCard";
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
      markdownPair
      visibility
      permissions
      latestVersion {
        id
        number
        createdAt
        fileUrl
        posterUrl
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
        posterUrl
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
          createdAt
          fileUrl
          posterUrl
          sizeBytes
          width
          height
          isVideo
          expiresAt
        }
      }
      project {
        id
        slug
        permissions
      }
      ...MediaComments_Media
      ...MediaCommentLayer_Media
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
 * grammar: the same viewer, the same controls, the same comment cards and the
 * same floating comment markers. The header carries the login control, since
 * commenting is the page's second job and an anonymous visitor needs to see the
 * way in.
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
  const [placing, setPlacing] = useState(false);
  const [versionId, setVersionId] = useState(media.latestVersion.id);
  // A thread the sidebar asked to open as a marker popover on the image.
  const [requestedThreadId, setRequestedThreadId] = useState<string | null>(
    null,
  );

  // Falls back to the latest if the selected version went away under us — a
  // retention purge can take an old one while the page is open.
  const version =
    media.versions.find((candidate) => candidate.id === versionId) ??
    media.latestVersion;

  const mentionUsers = useMemo(
    () => media.mentionableUsers.map(getMentionUser),
    [media.mentionableUsers],
  );

  // The comment components ask the project what the viewer may do — reacting is a
  // `review`, same as commenting. An anonymous visitor on a public link is not
  // shown the project at all, so they get no permissions, which is exactly right:
  // they can read the discussion and change nothing.
  return (
    <ProjectPermissionsContext value={media.project?.permissions ?? []}>
      <MentionableUsersProvider value={mentionUsers}>
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
                comments={{
                  media,
                  viewedVersionId: version.id,
                  placing,
                  onPlacingChange: setPlacing,
                  requestedThreadId,
                  onRequestedThreadConsumed: () => setRequestedThreadId(null),
                }}
              />
            </main>

            {/* `gap-2`: the build sidebar's own gap between panels. */}
            <aside className="flex w-full flex-col gap-2 lg:min-h-0 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
              <SharePanel media={media} version={version} />
              <DetailsPanel
                media={media}
                version={version}
                onSelectVersion={setVersionId}
              />
              <MediaComments
                media={media}
                viewedVersionId={version.id}
                placing={placing}
                onPlacingChange={setPlacing}
                onOpenPinned={(comment) => {
                  // The marker only exists on the version the pin was dropped
                  // on, so showing the thread may mean switching to it first.
                  if (comment.mediaVersionId) {
                    setVersionId(comment.mediaVersionId);
                  }
                  setRequestedThreadId(comment.id);
                }}
              />
            </aside>
          </div>
          <PageFooter />
        </div>
      </MentionableUsersProvider>
    </ProjectPermissionsContext>
  );
}

/**
 * The slim bar over the media: what this file is, where it lives, who may see
 * it, and who you are. The shield leads out to argos-ci.com — on a page every
 * reviewer of every pull request sees, that link is the whole top-of-funnel
 * job — and {@link NavUserControl} is the same login-or-avatar control as the
 * app's, so an anonymous visitor can see the way in to commenting.
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
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            {/* The file name is the page's title, in monospace because it is a
                value, not a sentence. */}
            <h1 className="truncate font-mono text-sm leading-tight font-medium">
              {media.name}
            </h1>
            <div className="text-low flex min-w-0 items-baseline gap-1.5 text-xs leading-tight">
              {media.project ? (
                // Only viewers who could reach the project anyway get it named —
                // the resolver hides it from everyone else.
                <HeadlessLink
                  href={`/${media.project.slug}`}
                  className="data-hovered:text-default rac-focus shrink-0 transition"
                >
                  {media.project.slug}
                </HeadlessLink>
              ) : null}
              {media.description ? (
                <span className="min-w-0 truncate">
                  {media.project ? (
                    <span aria-hidden="true" className="mr-1.5 opacity-60">
                      ·
                    </span>
                  ) : null}
                  {media.description}
                </span>
              ) : null}
            </div>
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

/** What the Share panel can put on the clipboard. */
type ShareFormat = {
  id: string;
  label: string;
  value: string;
};

/**
 * The last format the user copied, remembered across media: someone who embeds
 * Markdown in pull requests all day should find the panel already on it.
 */
const SHARE_FORMAT_STORAGE_KEY = "preferences.mediaShareFormat";

function getShareFormats(media: Media): ShareFormat[] {
  return [
    // First is the default: the pair's table when there is one — pasting it
    // shows before and after together, like the page does.
    ...(media.markdownPair
      ? [
          {
            id: "markdown-pair",
            label: "Markdown (before + after)",
            value: media.markdownPair,
          },
        ]
      : []),
    { id: "markdown", label: "Markdown", value: media.markdown },
    { id: "link", label: "Page link", value: media.url },
  ];
}

/**
 * Everything needed to pass the media along, front and center in the sidebar:
 * the raw bytes, then a format picker (the share page's URL, or Markdown ready
 * to paste into a pull request) and the snippet it produces. Copy actions on a
 * *single* pane of a pair live on the image's own controls; this panel speaks
 * for the media as a whole.
 */
function SharePanel(props: {
  media: Media;
  /** The version on screen — what Open original and Download act on. */
  version: Media["versions"][number];
}) {
  const { media, version } = props;
  const formats = getShareFormats(media);
  const [storedFormatId, setStoredFormatId] = useState<string | null>(() =>
    localStorage.getItem(SHARE_FORMAT_STORAGE_KEY),
  );
  const format =
    formats.find((candidate) => candidate.id === storedFormatId) ?? formats[0];
  invariant(format, "there is always at least one share format");

  return (
    <Panel>
      <div className="flex flex-col gap-3 px-4">
        <div className="flex items-center gap-2">
          <LinkButton
            variant="secondary"
            size="small"
            href={version.fileUrl}
            target="_blank"
          >
            <ButtonIcon>
              <ExternalLinkIcon />
            </ButtonIcon>
            Open original
          </LinkButton>
          <Button
            variant="secondary"
            size="small"
            onPress={() => {
              downloadWithToast(
                fetchBlob(version.fileUrl).then((blob) => {
                  downloadBlob(blob, getMediaDownloadName(media));
                }),
              );
            }}
          >
            <ButtonIcon>
              <DownloadIcon />
            </ButtonIcon>
            Download
          </Button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-low text-xs">Copy as</div>
          <Select
            aria-label="Copy as"
            selectedKey={format.id}
            onSelectionChange={(key) => {
              const id = String(key);
              setStoredFormatId(id);
              localStorage.setItem(SHARE_FORMAT_STORAGE_KEY, id);
            }}
          >
            <SelectButton size="sm" className="w-full">
              <SelectValue />
            </SelectButton>
            <Popover>
              <ListBox>
                {formats.map((candidate) => (
                  <ListBoxItem
                    key={candidate.id}
                    id={candidate.id}
                    textValue={candidate.label}
                  >
                    <ListBoxItemLabel>{candidate.label}</ListBoxItemLabel>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        </div>
        <div className="border-thin bg-subtle relative rounded-md py-2 pr-9 pl-2.5">
          <code className="text-default block max-h-36 overflow-auto font-mono text-xs break-all whitespace-pre-wrap">
            {format.value}
          </code>
          <CopyButton
            text={format.value}
            aria-label={`Copy ${format.label.toLowerCase()}`}
            className="absolute top-1.5 right-1.5"
          />
        </div>
      </div>
    </Panel>
  );
}

/**
 * The facts of the selected version, as labelled monospace values — a file
 * listing, not prose. The description lives in the header, next to the name it
 * belongs to.
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
