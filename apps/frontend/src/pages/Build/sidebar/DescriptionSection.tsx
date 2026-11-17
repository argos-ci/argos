import { Linkify } from "@/containers/Linkify";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";

import type { Diff } from "../BuildDiffState";
import { resolveDiffMetadata } from "../metadata/utils";

export function DescriptionSection(props: {
  diff: Diff;
  repoUrl: string | null;
}) {
  const { diff, repoUrl } = props;
  // Descriptions often come from template literals in test code: trimming
  // drops their outer blank lines, and `whitespace-pre-line` drops the
  // indentation of the lines in between while keeping the line breaks.
  const description = resolveDiffMetadata(diff)?.description?.trim();
  if (!description) {
    return null;
  }
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Description</PanelTitle>
      </PanelHeader>
      <p className="px-4 text-sm wrap-break-word whitespace-pre-line">
        <Linkify repoUrl={repoUrl}>{description}</Linkify>
      </p>
    </Panel>
  );
}
