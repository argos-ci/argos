import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  ChevronDownIcon,
  DownloadIcon,
  FileTextIcon,
  GitPullRequestIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
  MessagesSquareIcon,
  TerminalIcon,
} from "lucide-react";
import { Heading, MenuTrigger, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
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
import { MediaSharingIllustration } from "@/containers/EmptyStateIllustrations";
import { MediaComments } from "@/containers/Media/MediaComments";
import {
  groupMediaByPair,
  type MediaListEntry,
  MediaPullRequestList,
} from "@/containers/Media/MediaPullRequestList";
import { MediaVersions } from "@/containers/Media/MediaVersions";
import {
  getMediaDownloadName,
  MediaViewer,
  type ViewerDiff,
} from "@/containers/Media/MediaViewer";
import { NavUserControl } from "@/containers/NavUserControl";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { MediaDiffStatus, MediaState, MediaVisibility } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Button, LinkButton } from "@/ui/Button";
import { ButtonGroup } from "@/ui/ButtonGroup";
import { Chip } from "@/ui/Chip";
import { Code } from "@/ui/Code";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
} from "@/ui/Layout";
import { HeadlessLink } from "@/ui/Link";
import { Menu, MenuItem } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { toast } from "@/ui/Toaster";
import { Tooltip } from "@/ui/Tooltip";
import { getMentionUser } from "@/ui/UserCard";

/** What the viewer needs to draw one version of a media. */
const _ViewerVersionFragment = graphql(`
  fragment MediaShare_ViewerVersion on MediaVersion {
    id
    createdAt
    fileUrl
    posterUrl
    sizeBytes
    width
    height
    isVideo
  }
`);

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
      pullRequest {
        id
        ...PullRequestButton_PullRequest
      }
      pullRequestMedias {
        id
        ...MediaPullRequestList_Media
      }
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
        # Per version, not per media: an older version has its own comparison,
        # and it names the two images to put on screen.
        diff {
          id
          status
          url
          width
          height
          beforeVersion {
            id
            ...MediaShare_ViewerVersion
          }
          afterVersion {
            id
            ...MediaShare_ViewerVersion
          }
        }
      }
      counterpart {
        id
        name
        state
        url
        shareToken
        latestVersion {
          id
          ...MediaShare_ViewerVersion
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
  const { data, refetch } = useSuspenseQuery(MediaShareQuery, {
    variables: { shareToken, ...roleScope },
  });

  const media = data.mediaByShareToken;

  useAwaitPendingDiff({
    // The newest version's, which is the only comparison that can still be
    // queued: an older one was settled back when it was the newest.
    pending:
      media?.versions.find(
        (candidate) => candidate.id === media.latestVersion.id,
      )?.diff?.status === MediaDiffStatus.Pending,
    refetch,
  });

  if (!media) {
    return <UnavailableState />;
  }

  // A pair has one page, and it is the "after".
  //
  // Both halves show the same two images side by side, so two pages meant one
  // subject with two comment threads on it, split by which link the reviewer
  // happened to click — a remark about the change landing where whoever came
  // the other way would never see it. The "after" is the state being reviewed,
  // so it is the one that keeps the conversation, and the "before" sends its
  // visitors there.
  //
  // Only when the counterpart is actually visible: the field is filtered by
  // what the viewer may see, so a public "before" whose "after" is team-only
  // stays where it is rather than bouncing someone into a dead end.
  if (media.state === MediaState.Before && media.counterpart) {
    return <Navigate replace to={`/m/${media.counterpart.shareToken}`} />;
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

/**
 * The mask to draw over the pair, or null when there is nothing to draw.
 *
 * Four ways there is nothing: the media stands alone, the comparison has not
 * landed yet, it failed, or it ran and found the two halves identical. None of
 * them is an error, and the page says the same thing about all of them — it
 * shows the pair without an overlay.
 *
 * The comparison comes from the version on screen, so looking back at an older
 * upload draws the mask that was computed from *it* — together with
 * {@link getCounterpartVersion}, which puts the half it was computed against
 * beside it. A mask only describes the two images it came from.
 */
function getViewerDiff(version: Media["versions"][number]): ViewerDiff | null {
  const { diff } = version;
  if (!diff?.url || !diff.width || !diff.height) {
    return null;
  }
  return { url: diff.url, width: diff.width, height: diff.height };
}

/**
 * The other half to show beside this version: the one its comparison was
 * computed against.
 *
 * Falls back to the counterpart's newest when the two were never compared —
 * that is the pair the reviewer would otherwise expect, and there is no mask to
 * contradict it.
 */
function getCounterpartVersion(
  media: Media,
  version: Media["versions"][number],
): DocumentType<typeof _ViewerVersionFragment> | null {
  const { counterpart } = media;
  if (!counterpart) {
    return null;
  }
  const { diff } = version;
  if (!diff) {
    return counterpart.latestVersion;
  }
  // The sides are named after the pair, not after this media: whichever one is
  // not this version is the other half.
  return diff.beforeVersion.id === version.id
    ? diff.afterVersion
    : diff.beforeVersion;
}

/** How often the page asks whether the pair's comparison has landed. */
const DIFF_POLL_INTERVAL = 3000;

/**
 * How long to keep asking. A comparison is queued the moment a share page is
 * opened on an uncompared pair and takes seconds; past a couple of minutes the
 * worker is not coming, and a page left open overnight must not keep asking
 * about it.
 */
const DIFF_POLL_ATTEMPTS = 40;

/**
 * Wait for a queued comparison the way the reviewer would: keep asking, and stop
 * as soon as there is an answer.
 *
 * The diff is computed off the request — an upload does not wait for it and the
 * first page load usually beats it — so without this the overlay would only
 * appear on a manual reload. `startTransition` keeps the refetch from
 * re-suspending the page: the media is already on screen and nothing about it
 * is changing.
 */
function useAwaitPendingDiff(props: {
  pending: boolean;
  refetch: () => Promise<unknown>;
}) {
  const { pending, refetch } = props;
  useEffect(() => {
    if (!pending) {
      return undefined;
    }
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (attempts > DIFF_POLL_ATTEMPTS) {
        window.clearInterval(interval);
        return;
      }
      startTransition(() => {
        // A failed poll is not worth reporting: the media is already on screen,
        // and the next tick asks again. Left unhandled it would be an unhandled
        // rejection every three seconds through a network blip.
        refetch().catch(() => undefined);
      });
    }, DIFF_POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [pending, refetch]);
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
  // The newest is the fallback, and `versions` is newest first. Read from that
  // list rather than from `latestVersion` because only these carry the
  // comparison the viewer draws.
  const newestVersion = media.versions[0];
  invariant(newestVersion, "a listed media has an uploaded version");
  const version =
    media.versions.find((candidate) => candidate.id === versionId) ??
    newestVersion;
  const counterpartVersion = getCounterpartVersion(media, version);

  const mentionUsers = useMemo(
    () => media.mentionableUsers.map(getMentionUser),
    [media.mentionableUsers],
  );

  const entries = useMemo(
    () => groupMediaByPair(media.pullRequestMedias),
    [media.pullRequestMedias],
  );
  // The row this page is showing — matched against both halves, because a pair
  // is one row and either half can be the one that was opened.
  const activeIndex = entries.findIndex((entry) =>
    entry.medias.some((candidate) => candidate.id === media.id),
  );
  // One entry is this media itself, and a list of one is a list of where you
  // already are.
  const showList = entries.length > 1;
  const navigate = useNavigate();
  // The next media has to be fetched, and until it is, the page still shows the
  // current one. Marking that wait as a transition keeps the media on screen
  // instead of flashing a fallback, and `isNavigating` closes the door behind
  // it: a second press while the first is in flight would step from the media
  // being replaced, landing somewhere nobody asked for.
  const [isNavigating, startNavigating] = useTransition();
  const goToEntry = (entry: MediaListEntry) => {
    // Same route, so the page stays mounted and the query refetches under it
    // rather than the whole share page unmounting and suspending.
    startNavigating(() => {
      navigate(`/m/${entry.target.shareToken}`);
    });
  };
  const nav = showList
    ? {
        hasPrevious: activeIndex > 0 && !isNavigating,
        hasNext:
          activeIndex !== -1 &&
          activeIndex < entries.length - 1 &&
          !isNavigating,
        onPrevious: () => {
          const previous = entries[activeIndex - 1];
          if (previous) {
            goToEntry(previous);
          }
        },
        onNext: () => {
          const next = entries[activeIndex + 1];
          if (next) {
            goToEntry(next);
          }
        },
      }
    : null;

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
            <PageHeader media={media} />
            <div className="bg-subtle flex flex-1 flex-col gap-4 p-4 lg:min-h-0 lg:flex-row">
              {showList ? (
                // Below `lg` the page stacks, and the list goes last: every
                // pixel above the media is a pixel of it the visitor cannot
                // see. Beside it, the list is where a build puts its own.
                <aside className="flex w-full flex-col max-lg:order-last lg:min-h-0 lg:w-56 lg:shrink-0">
                  <MediaPullRequestList
                    entries={entries}
                    activeEntryKey={entries[activeIndex]?.key ?? null}
                    onSelect={goToEntry}
                  />
                </aside>
              ) : null}
              <main className="flex min-w-0 flex-col justify-center lg:min-h-0 lg:flex-1">
                <MediaViewer
                  nav={nav}
                  media={{ ...media, version }}
                  counterpart={
                    media.counterpart && counterpartVersion
                      ? {
                          ...media.counterpart,
                          // The half the selected version was compared against,
                          // not simply the counterpart's newest: the two media
                          // have independent histories, and the pair on screen
                          // has to be the pair the mask describes.
                          version: counterpartVersion,
                        }
                      : null
                  }
                  diff={getViewerDiff(version)}
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
                  <MediaDescription media={media} />
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
          </div>
        </BuildHotkeysDialogStateProvider>
      </MentionableUsersProvider>
    </ProjectPermissionsContext>
  );
}

/** What the page can put on the clipboard. */
type ShareFormat = {
  id: string;
  /** The action itself, spelled out — the menu row and the button's own label. */
  label: string;
  /** What landed on the clipboard, for the toast to name. */
  copied: string;
  value: string;
};

/**
 * The last format the user copied, remembered across media: someone who embeds
 * Markdown in pull requests all day should find the button already on it.
 */
const SHARE_FORMAT_STORAGE_KEY = "preferences.mediaShareFormat";

/**
 * The Markdown embeds this page can hand over: the pair's table when the media
 * has a counterpart, and the media's own.
 *
 * No page link among them — the strip's own link button is already that, and a
 * menu whose rows are "the thing beside me" reads as a second way to do the
 * same thing.
 */
function getShareFormats(media: Media): ShareFormat[] {
  // Which half this is, when it is one. A pair's two halves embed different
  // images under one name, so "Markdown" alone would not say which is going on
  // the clipboard.
  const own = media.state ? `Markdown for ${media.state}` : "Markdown";
  return [
    // First is the default: the pair's table when there is one — pasting it
    // shows before and after together, like the page does.
    ...(media.markdownPair
      ? [
          {
            id: "markdown-pair",
            label: "Copy Markdown for before and after",
            copied: "Markdown for before and after",
            value: media.markdownPair,
          },
        ]
      : []),
    {
      id: "markdown",
      label: `Copy ${own}`,
      copied: own,
      value: media.markdown,
    },
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
    toast.success(`${target.copied} copied`, { id: SHARE_COPY_TOAST_ID });
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
      {/* One format is a button, not a menu: a chevron opening a list with a
          single row is furniture, and the button already says what it copies. */}
      <ButtonGroup>
        <HotkeyTooltip
          description={format.label}
          keys={copyAsHotkey.displayKeys}
        >
          <Button
            variant="secondary"
            iconOnly
            aria-label={format.label}
            onPress={() => copyFormat(format)}
          >
            <FileTextIcon />
          </Button>
        </HotkeyTooltip>
        {formats.length > 1 ? (
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
        ) : null}
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
 * The bar over the page: whose infrastructure served it on the left, and on the
 * right where the media came from, who can open it, and the same
 * login-or-avatar control as the app's.
 *
 * The name is not here — it sits over the media itself, where a build puts its
 * snapshot's, so the two pages read the same way. That leaves the corner for the
 * logo, which is what a visitor who has never seen Argos needs from this page.
 */
function PageHeader(props: { media: Media }) {
  const { media } = props;
  return (
    <header className="border-b-thin flex shrink-0 items-center justify-between gap-4 px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <Tooltip content="Visual testing for your pull requests">
          <HeadlessLink
            href="https://argos-ci.com"
            target="_blank"
            // The mark is the link; the usual arrow beside it would hang off a
            // logo rather than off a phrase.
            external={false}
            aria-label="Argos"
            className="shrink-0 transition hover:brightness-125"
          >
            <BrandShield height={32} />
          </HeadlessLink>
        </Tooltip>
        {/* Null unless the viewer can reach the project — the resolver decides,
            so nothing here has to remember not to leak it. Reads as the build
            header's breadcrumb does: whose infrastructure, then whose work. */}
        {media.project ? (
          <Tooltip content="See all builds">
            <HeadlessLink
              href={`/${media.project.slug}/builds`}
              className="text-low data-hovered:text-default rac-focus min-w-0 truncate text-xs leading-none transition"
            >
              {media.project.slug}
            </HeadlessLink>
          </Tooltip>
        ) : null}
        {/* With the project, not with the actions: both answer "whose is this
            and who can open it", and the answer matters most at the moment of
            forwarding the link. */}
        <VisibilityChip visibility={media.visibility} />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {media.pullRequest ? (
          <PullRequestButton
            pullRequest={media.pullRequest}
            size="small"
            target="_blank"
          />
        ) : null}
        <NavUserControl />
      </div>
    </header>
  );
}

/**
 * The prose that shipped with the upload, in full — the sidebar has the room
 * for a sentence the old one-line header did not.
 *
 * Deliberately not a panel, and deliberately alone: the version's numbers read
 * beside the file name over the media itself, where the name they describe is,
 * and a titled card around one paragraph is a title saying what the paragraph
 * says. Nothing at all when the upload shipped without a description.
 */
function MediaDescription(props: { media: Media }) {
  const { media } = props;
  if (!media.description) {
    return null;
  }
  return <p className="text-low px-1 text-sm">{media.description}</p>;
}

/**
 * One state for every reason a link stops working — expired, deleted, never
 * finished uploading, or never valid at all.
 *
 * Deliberately does not say which. Telling them apart would let anyone holding
 * a token learn whether it ever pointed at something, and for the person
 * reading it the answer is the same either way. What the page does say is what
 * the link *was* — media shared through Argos — because the two people who
 * land here need different exits: a teammate signs in and gets the media back,
 * anyone else gets to find out what their own team could be sharing.
 */
function UnavailableState() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-dvh flex-col">
      <Helmet>
        <title>Media unavailable</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="bg-subtle flex flex-1 flex-col justify-center py-8">
        <EmptyState>
          <EmptyStateIllustration>
            <MediaSharingIllustration />
          </EmptyStateIllustration>
          {/* Still the page's `h1`: the empty state is the whole document. */}
          <Heading level={1}>This media is no longer available</Heading>
          <Text slot="description">
            The link has expired, the file was deleted, or you need to be signed
            in to a team that has access to it. Links like this one are how
            teams on Argos share screenshots and recordings in their pull
            requests.
          </Text>
          <EmptyStateActions>
            <LinkButton
              variant="secondary"
              href={`/login?r=${encodeURIComponent(pathname)}`}
            >
              Sign in
            </LinkButton>
            <LinkButton href="/signup">Try Argos for free</LinkButton>
          </EmptyStateActions>
          <EmptyStateLearnMore href="https://argos-ci.com/docs/learn/media/standalone-media-upload">
            Learn how media sharing works
          </EmptyStateLearnMore>
          <EmptyStateSteps>
            <EmptyStateStep
              icon={<TerminalIcon />}
              step="From your terminal"
              title="Upload a screenshot or recording"
            >
              One <Code>argos upload</Code> from a shell or a CI job hosts the
              file and hands back a link with ready-to-paste Markdown.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<GitPullRequestIcon />}
              step="In your pull request"
              title="Embed it where you review"
            >
              Drop the Markdown into a pull request, an issue or a changelog —
              before and after render side by side.
            </EmptyStateStep>
            <EmptyStateStep
              icon={<MessagesSquareIcon />}
              step="With your team"
              title="Review it together"
            >
              Teammates pin comments straight onto the pixels, follow new
              versions, and choose who can open the link.
            </EmptyStateStep>
          </EmptyStateSteps>
        </EmptyState>
      </div>
    </div>
  );
}
