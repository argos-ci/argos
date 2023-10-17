import { Chip } from "@/ui/Chip";
import { Anchor } from "@/ui/Link";
import { Tooltip } from "@/ui/Tooltip";
import { FlaskConical } from "lucide-react";

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
