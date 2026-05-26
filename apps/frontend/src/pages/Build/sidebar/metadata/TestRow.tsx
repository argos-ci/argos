import { FlaskConicalIcon } from "lucide-react";

import type { ScreenshotMetadataTest } from "@/gql/graphql";

import { LocationChip } from "./LocationChip";
import { MetadataRow } from "./MetadataRow";

export function TestRow(props: {
  test: ScreenshotMetadataTest | null;
  branch: string | null | undefined;
  repoUrl: string | null;
}) {
  const { test, branch, repoUrl } = props;
  if (!test) {
    return null;
  }
  return (
    <MetadataRow>
      <LocationChip
        location={test.location}
        icon={FlaskConicalIcon}
        tooltip="View test on GitHub"
        branch={branch}
        repoUrl={repoUrl}
      >
        {test.titlePath
          .filter(Boolean)
          .map((x) => x.trim())
          .join(" › ")}
      </LocationChip>
    </MetadataRow>
  );
}
