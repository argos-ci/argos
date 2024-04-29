import { FlaskConical } from "lucide-react";

import { Anchor } from "@/ui/Anchor";
import { Chip } from "@/ui/Chip";
import { Tooltip } from "@/ui/Tooltip";

export function TestIndicator({
  test,
  repoUrl,
  branch,
  ...props
}: {
  repoUrl: string | null;
  branch: string | null;
  test: {
    id?: string | null;
    title: string;
    titlePath: string[];
    location?: {
      file: string;
      line: number;
    } | null;
  };
  className?: string;
}) {
  const title = test.titlePath
    .filter(Boolean)
    .map((x) => x.trim())
    .join(" › ");
  if (test.location && repoUrl && branch) {
    return (
      <Tooltip content="View test on GitHub">
        <Chip icon={FlaskConical} scale="xs" {...props}>
          <Anchor
            external
            href={`${repoUrl}/blob/${branch}/${test.location.file}#L${test.location.line}`}
          >
            {title}
          </Anchor>
        </Chip>
      </Tooltip>
    );
  }
  return (
    <Chip icon={FlaskConical} scale="xs" {...props}>
      {title}
    </Chip>
  );
}
