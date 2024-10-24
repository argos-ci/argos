import { FlaskConical } from "lucide-react";

import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";

export function TestIndicator({
  test,
  repoUrl,
  branch,
  ...props
}: {
  repoUrl: string | null;
  branch: string | null | undefined;
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
          <Link
            href={`${repoUrl}/blob/${branch}/${test.location.file.replace(/^\/github\/workspace\//, "")}#L${test.location.line}`}
            target="_blank"
          >
            {title}
          </Link>
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
