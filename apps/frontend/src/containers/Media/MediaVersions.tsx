import { Toggle } from "@base-ui/react/toggle";
import { CheckIcon } from "lucide-react";

import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Time } from "@/ui/Time";

import { MediaVersionThumbnail } from "./MediaVersionThumbnail";

type MediaVersionRow = {
  id: string;
  number: number;
  createdAt: string;
  fileUrl: string;
  posterUrl: string | null;
  isVideo: boolean;
};

/**
 * The sidebar panel listing a media's uploads, one row per version with its
 * thumbnail and upload time.
 *
 * Newest first and selected by default, because the newest is what the share
 * URL means and what a reviewer is being asked about. The older ones answer
 * "what did this look like before you changed it?" without needing a second
 * link — the reason versions exist rather than overwriting.
 *
 * Hidden entirely for a media uploaded once: a list with one row is furniture.
 */
export function MediaVersions(props: {
  versions: MediaVersionRow[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const { versions, selectedId, onSelect } = props;

  if (versions.length < 2) {
    return null;
  }

  const ordered = versions.toSorted((a, b) => b.number - a.number);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Versions</PanelTitle>
      </PanelHeader>
      <div className="flex flex-col gap-0.5 px-1.5">
        {ordered.map((version, index) => (
          <Toggle
            key={version.id}
            pressed={version.id === selectedId}
            // Radio semantics on a toggle: picking the selected row again
            // keeps it selected instead of leaving nothing on screen, which
            // is why the new pressed state is ignored.
            onPressedChange={() => onSelect(version.id)}
            className="focus-ring group hover:bg-hover data-pressed:bg-ui flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs"
          >
            <MediaVersionThumbnail version={version} className="size-8" />
            <span className="shrink-0 font-mono font-medium tabular-nums">
              v{version.number}
            </span>
            <span className="text-low min-w-0 flex-1 truncate">
              <Time date={version.createdAt} />
            </span>
            {index === 0 ? (
              <span className="text-low shrink-0">Latest</span>
            ) : null}
            {/* Always in the row so the "Latest" column lines up; only
                visible on the selected one. */}
            <CheckIcon
              aria-hidden="true"
              className="invisible size-3.5 shrink-0 group-data-pressed:visible"
            />
          </Toggle>
        ))}
      </div>
    </Panel>
  );
}
