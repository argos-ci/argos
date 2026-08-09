import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  ChevronDownIcon,
  ClipboardListIcon,
  ClockFadingIcon,
  DownloadIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
} from "lucide-react";
import { MenuTrigger } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";
import { useClipboard } from "use-clipboard-copy";

import {
  BuildHotkeysDialog,
  useBuildHotkey,
} from "@/containers/Build/BuildHotkeys";
import { BuildHotkeysDialogStateProvider } from "@/containers/Build/BuildHotkeysDialogState";
import {
  downloadBlob,
  downloadWithToast,
  fetchBlob,
} from "@/containers/Build/ScreenshotActions";
import { MentionableUsersProvider } from "@/containers/Comment/MentionableUsersContext";
import { useCommentRoleScope } from "@/containers/Comment/useCommentRoleScope";
import { MediaComments } from "@/containers/Media/MediaComments";
import { MediaVersions } from "@/containers/Media/MediaVersions";
import {
  getMediaDownloadName,
  MediaViewer,
} from "@/containers/Media/MediaViewer";
import { NavUserControl } from "@/containers/NavUserControl";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { MediaVisibility } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Button } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip } from "@/ui/Chip";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { Link } from "@/ui/Link";
import { Menu, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { toast } from "@/ui/Toaster";
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
 * No header at all — every pixel above the media is a pixel of it the visitor
 * cannot see. The viewer owns the page; identity, actions and facts live in the
 * sidebar and the footer, and the whole surface is driven by the same
 * primitives as the build page: the same viewer, the same controls, the same
 * comment cards, the same floating markers, the same hotkeys.
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
        <BuildHotkeysDialogStateProvider>
          <BuildHotkeysDialog env="media" />
          <div className="flex min-h-dvh flex-col lg:h-dvh">
            <PageHeader media={media} version={version} />
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

              <aside className="flex w-full flex-col lg:min-h-0 lg:w-80 lg:shrink-0">
                <MediaActions media={media} version={version} />
                {/* Only the panels scroll: the action strip is page chrome and
                    stays put, instead of getting clipped at the fold. `pb-6`
                    is the build sidebar's: without it the scroll container
                    crops the last panel's shadow. */}
                <div className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pb-6">
                  <MediaVersions
                    versions={media.versions}
                    selectedId={version.id}
                    onSelect={setVersionId}
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
                </div>
              </aside>
            </div>
            <PageFooter />
          </div>
        </BuildHotkeysDialogStateProvider>
      </MentionableUsersProvider>
    </ProjectPermissionsContext>
  );
}

/** What the page can put on the clipboard. */
type ShareFormat = {
  id: string;
  label: string;
  value: string;
};

/**
 * The last format the user copied, remembered across media: someone who embeds
 * Markdown in pull requests all day should find the button already on it.
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

// One toast per copy action, replaced rather than stacked.
const SHARE_COPY_TOAST_ID = "media-share-copied";

/**
 * The sidebar's action strip: copy the link, download the bytes, and copy the
 * media in the remembered format — the chevron picks another one. Everything
 * here has a shortcut, spelled out on the tooltips and in the `?` dialog.
 */
function MediaActions(props: {
  media: Media;
  /** The version on screen — what Download acts on. */
  version: Media["versions"][number];
}) {
  const { media, version } = props;
  const clipboard = useClipboard();
  const formats = getShareFormats(media);
  const [storedFormatId, setStoredFormatId] = useState<string | null>(() =>
    localStorage.getItem(SHARE_FORMAT_STORAGE_KEY),
  );
  const format =
    formats.find((candidate) => candidate.id === storedFormatId) ?? formats[0];
  invariant(format, "there is always at least one share format");

  const copyFormat = (target: ShareFormat) => {
    clipboard.copy(target.value);
    toast.success(`Copied as ${target.label.toLowerCase()}`, {
      id: SHARE_COPY_TOAST_ID,
    });
  };
  const copyLink = () => {
    clipboard.copy(media.url);
    toast.success("Link copied", { id: SHARE_COPY_TOAST_ID });
  };
  const download = () => {
    downloadWithToast(
      fetchBlob(version.fileUrl).then((blob) => {
        downloadBlob(blob, getMediaDownloadName(media));
      }),
    );
  };

  const copyLinkHotkey = useBuildHotkey("copyMediaLink", copyLink);
  const downloadHotkey = useBuildHotkey("downloadMedia", download);
  const copyAsHotkey = useBuildHotkey(
    "copyAsSelectedFormat",
    () => {
      // A real selection beats the shortcut: let the browser copy it.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }
      copyFormat(format);
    },
    { preventDefault: false },
  );

  return (
    // 24px between the controls and the panels below, so the strip reads as
    // page chrome rather than as the first panel's toolbar.
    <div className="mb-6 flex shrink-0 items-center justify-end gap-2">
      <HotkeyTooltip description="Copy link" keys={copyLinkHotkey.displayKeys}>
        <Button
          variant="secondary"
          iconOnly
          aria-label="Copy link"
          onPress={copyLink}
        >
          <LinkIcon />
        </Button>
      </HotkeyTooltip>
      <HotkeyTooltip description="Download" keys={downloadHotkey.displayKeys}>
        <Button
          variant="secondary"
          iconOnly
          aria-label="Download"
          onPress={download}
        >
          <DownloadIcon />
        </Button>
      </HotkeyTooltip>
      <ButtonGroup>
        <HotkeyTooltip
          description={`Copy as ${format.label.toLowerCase()}`}
          keys={copyAsHotkey.displayKeys}
        >
          <Button
            variant="secondary"
            iconOnly
            aria-label={`Copy as ${format.label}`}
            onPress={() => copyFormat(format)}
          >
            <ClipboardListIcon />
          </Button>
        </HotkeyTooltip>
        <MenuTrigger>
          <Button
            variant="secondary"
            iconOnly
            aria-label="Choose a copy format"
          >
            <ChevronDownIcon />
          </Button>
          <Popover placement="bottom end">
            <Menu aria-label="Copy formats">
              {formats.map((candidate) => (
                <MenuItem
                  key={candidate.id}
                  onAction={() => {
                    // Copy right away *and* make it the button's format: the
                    // menu is how the default is changed.
                    setStoredFormatId(candidate.id);
                    localStorage.setItem(
                      SHARE_FORMAT_STORAGE_KEY,
                      candidate.id,
                    );
                    copyFormat(candidate);
                  }}
                >
                  {candidate.label}
                </MenuItem>
              ))}
            </Menu>
          </Popover>
        </MenuTrigger>
      </ButtonGroup>
    </div>
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
          <Chip color="neutral" icon={GlobeIcon}>
            Public link
          </Chip>
        </Tooltip>
      );
    case MediaVisibility.Team:
      return (
        <Tooltip content="Only members of the team can view this media">
          <Chip color="neutral" icon={LockIcon}>
            Team only
          </Chip>
        </Tooltip>
      );
  }
}

/**
 * The bar over the media, two lines and done: what the file is (name and the
 * prose that shipped with it), then the version's numbers — dimensions, size,
 * time left — with who may open it and the same login-or-avatar control as
 * the app's on the right. Every value reads without a label, the way a file
 * listing does. Versions have their own panel in the sidebar.
 */
function PageHeader(props: {
  media: Media;
  version: Media["versions"][number];
}) {
  const { media, version } = props;
  const facts: React.ReactNode[] = [];
  if (media.state && !media.counterpart) {
    // Which half of a pair this is. With both halves on the page the panes
    // label themselves; alone, the fact lives here.
    facts.push(media.state);
  }
  const dimensions = formatDimensions(version.width, version.height);
  if (dimensions) {
    facts.push(dimensions);
  }
  facts.push(formatBytes(version.sizeBytes));
  const expiry = formatExpiry(version.expiresAt);
  if (expiry) {
    facts.push(
      <Tooltip content="Time left before this version is deleted">
        {/* A live countdown: neutralized in visual tests so the baseline
            doesn't change every day, the same way `<Time>` is. */}
        <span data-visual-test="transparent">{expiry}</span>
      </Tooltip>,
    );
  }

  return (
    <header className="border-b-thin flex shrink-0 items-center justify-between gap-4 px-4 py-2">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          {/* The file name is the page's title, in monospace because it is a
              value, not a sentence. */}
          <h1 className="shrink-0 font-mono text-sm leading-tight font-medium">
            {media.name}
          </h1>
          {media.description ? (
            <span className="text-low min-w-0 truncate text-xs leading-tight">
              <span aria-hidden="true" className="mr-1.5 opacity-60">
                ·
              </span>
              {media.description}
            </span>
          ) : null}
        </div>
        <div className="text-default flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-xs leading-tight">
          {facts.map((fact, index) => (
            // Order is fixed and the parts are static per render.
            // oxlint-disable-next-line react/no-array-index-key
            <span key={index} className="flex items-baseline gap-x-2">
              {index > 0 ? (
                <span aria-hidden="true" className="text-low opacity-60">
                  ·
                </span>
              ) : null}
              {fact}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <VisibilityChip visibility={media.visibility} />
        <NavUserControl />
      </div>
    </header>
  );
}

/**
 * The tiny footer: one line saying whose infrastructure served the page — the
 * name spelled out for a visitor who has never seen it.
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
 * One state for every reason a link stops working — expired, deleted, never
 * finished uploading, or never valid at all.
 *
 * Deliberately does not say which. Telling them apart would let anyone holding a
 * token learn whether it ever pointed at something, and for the person reading it
 * the answer is the same either way. The footer keeps its login control: for a
 * team-only media, signing in *is* the fix.
 */
function UnavailableState() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Helmet>
        <title>Media unavailable</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
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
