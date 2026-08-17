import { useEffect, useRef, useState } from "react";
import { FilmIcon } from "lucide-react";

import {
  constraintSize,
  DiffCard,
  DiffCardFooter,
  DiffCardFooterText,
  ListItemButton,
} from "@/containers/Build/BuildDiffListPrimitives";
import { type DocumentType, graphql } from "@/gql";
import { ImageKitPicture } from "@/ui/ImageKitPicture";

const _MediaFragment = graphql(`
  fragment MediaPullRequestList_Media on Media {
    id
    name
    state
    shareToken
    latestVersion {
      id
      fileUrl
      posterUrl
      width
      height
      isVideo
    }
  }
`);

type ListMedia = DocumentType<typeof _MediaFragment>;

/**
 * One row of the sidebar: a standalone media, or a before/after pair.
 *
 * A pair is one row because both halves open the same screen — the share page
 * shows them side by side whichever one is asked for — so listing them twice
 * would be two entries pointing at one destination.
 */
export type MediaListEntry = {
  key: string;
  name: string;
  /** The half a click opens: the "after", which is what the reviewer came for. */
  target: ListMedia;
  /** Every half the viewer can see, which is what tells the row it is active. */
  medias: ListMedia[];
};

/**
 * Group a pull request's media so the two halves of a pair land in one row —
 * the same grouping, keyed the same way, that the managed pull request comment
 * uses to put a pair on one line.
 *
 * A media with no state is its own row, keyed by id so a standalone
 * `checkout.png` never absorbs a `checkout.png` that is half of a pair. Order is
 * first-seen, which is upload order: the server sends them oldest first.
 */
export function groupMediaByPair(
  medias: readonly ListMedia[],
): MediaListEntry[] {
  const groups = new Map<string, MediaListEntry>();
  for (const media of medias) {
    const key = media.state ? `pair:${media.name}` : `solo:${media.id}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        key,
        name: media.name,
        target: media,
        medias: [media],
      });
      continue;
    }
    group.medias.push(media);
    // The "after" wins the row: it is the state of the work being reviewed, and
    // landing on the "before" would open the same comparison the long way round.
    // A mixed-visibility pair can leave a viewer with only the "before" — then
    // it stays the target, because it is the only half there is.
    if (media.state === "after") {
      group.target = media;
    }
  }
  return [...groups.values()];
}

/** How big a thumbnail gets. Narrower than the build's, for a narrower sidebar. */
const THUMBNAIL_CONSTRAINTS = { maxWidth: 208, maxHeight: 280 };

/** What a media with no recorded dimensions falls back to. */
const THUMBNAIL_DEFAULT_HEIGHT = 160;

/**
 * Everything uploaded to the pull request, in one scrollable column.
 *
 * Deliberately not the build's list: there is no virtualizing, no grouping and
 * no filtering here, because a pull request carries a handful of screenshots and
 * a build carries thousands. What it does share is the build's cards, its arrow
 * keys and its two arrow buttons — the reviewer moves through a pull request's
 * media the way they move through a build's snapshots.
 */
export function MediaPullRequestList(props: {
  entries: MediaListEntry[];
  activeEntryKey: string | null;
  onSelect: (entry: MediaListEntry) => void;
}) {
  const { entries, activeEntryKey, onSelect } = props;
  return (
    <div
      role="region"
      aria-label="Pull request media"
      className="group/sidebar flex min-h-0 flex-col gap-4 lg:overflow-y-auto lg:pb-6"
    >
      {entries.map((entry) => (
        <MediaListItem
          key={entry.key}
          entry={entry}
          isActive={entry.key === activeEntryKey}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function MediaListItem(props: {
  entry: MediaListEntry;
  isActive: boolean;
  onSelect: (entry: MediaListEntry) => void;
}) {
  const { entry, isActive, onSelect } = props;
  const ref = useRef<HTMLDivElement>(null);

  // Arrow keys move the active row without touching the scroll position, so a
  // row navigated to from the keyboard can be off screen. `nearest` scrolls only
  // when it has to, which leaves clicks alone.
  useEffect(() => {
    if (isActive) {
      ref.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  const { latestVersion } = entry.target;
  const dimensions =
    latestVersion.width && latestVersion.height
      ? constraintSize(
          { width: latestVersion.width, height: latestVersion.height },
          THUMBNAIL_CONSTRAINTS,
        )
      : {
          width: THUMBNAIL_CONSTRAINTS.maxWidth,
          height: THUMBNAIL_DEFAULT_HEIGHT,
        };

  return (
    <ListItemButton
      ref={ref}
      onClick={() => {
        // The row already on screen: navigating to it would reload the page it
        // is showing.
        if (!isActive) {
          onSelect(entry);
        }
      }}
      aria-current={isActive ? "true" : undefined}
      className="shrink-0"
    >
      {/* `min-h-25` is the floor the build list puts under its own rows: a
          wide, short upload — a header strip, a toolbar — fits the sidebar's
          width at a handful of pixels tall, and a card that height is a pill
          with a file name in it, indistinguishable from a button. */}
      <DiffCard isActive={isActive} variant="primary" className="min-h-25 p-2">
        <MediaThumbnail version={latestVersion} dimensions={dimensions} />
        <DiffCardFooter alwaysVisible>
          {latestVersion.isVideo ? (
            <FilmIcon className="text-low size-3 shrink-0" />
          ) : null}
          <DiffCardFooterText>{entry.name}</DiffCardFooterText>
        </DiffCardFooter>
      </DiffCard>
    </ListItemButton>
  );
}

function MediaThumbnail(props: {
  version: ListMedia["latestVersion"];
  dimensions: { width: number; height: number };
}) {
  const { version, dimensions } = props;
  const [posterFailed, setPosterFailed] = useState(false);
  // Decorative: the name is spelled out in the footer right under it, so the
  // image says nothing the row does not already say.
  const imgProps = {
    alt: "",
    className: "max-h-full max-w-full object-contain",
  };

  if (version.isVideo) {
    // A recording that has no frame to show yet, or whose frame did not load:
    // the film icon says what it is, where a broken image would only say that
    // something went wrong with a thumbnail nobody asked about.
    if (!version.posterUrl || posterFailed) {
      return <FilmIcon className="text-low size-8" />;
    }
    // The poster comes out of the CDN already transformed — it is a frame taken
    // from the video — so it is used as it is. Handing it to `ImageKitPicture`
    // would append a second set of transformations to a URL that has one.
    return (
      <img
        src={version.posterUrl}
        onError={() => setPosterFailed(true)}
        {...dimensions}
        {...imgProps}
      />
    );
  }

  return (
    <ImageKitPicture
      key={version.fileUrl}
      src={version.fileUrl}
      {...dimensions}
      transformations={[
        `w-${dimensions.width}`,
        `h-${dimensions.height}`,
        "c-at_max",
        "dpr-2",
      ]}
      {...imgProps}
    />
  );
}
