import { clsx } from "clsx";

import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

export type PickableVersion = {
  id: string;
  number: number;
  createdAt: string;
};

/**
 * Switch between a media's uploads.
 *
 * Newest first and selected by default, because the newest is what the share URL
 * means and what a reviewer is being asked about. The older ones are there to
 * answer "what did this look like before you changed it?" without needing a second
 * link — the reason versions exist rather than overwriting.
 *
 * Hidden entirely for a media uploaded once: a picker with one option is furniture.
 */
export function MediaVersionPicker(props: {
  versions: PickableVersion[];
  selectedId: string;
  onSelect: (versionId: string) => void;
}) {
  const { versions, selectedId, onSelect } = props;

  if (versions.length < 2) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-low mr-0.5 text-xs">Versions</span>
      {versions.map((version) => {
        const selected = version.id === selectedId;
        return (
          <Tooltip
            key={version.id}
            content={
              <>
                Uploaded <Time date={version.createdAt} />
              </>
            }
          >
            <button
              type="button"
              onClick={() => onSelect(version.id)}
              aria-pressed={selected}
              className={clsx(
                "rounded-full px-2 py-0.5 font-mono text-xs tabular-nums transition",
                "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "bg-primary-solid text-white"
                  : "bg-ui text-low hover:text-default",
              )}
            >
              v{version.number}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
