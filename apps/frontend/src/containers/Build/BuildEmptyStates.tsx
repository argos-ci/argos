import { ImagesIcon, SquareSlashIcon } from "lucide-react";

import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
} from "@/ui/Layout";

export function SkippedBuildEmptyState() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <SquareSlashIcon />
      </EmptyStateIcon>
      <Heading>Skipped build</Heading>
      <EmptyStateDescription>
        This build has been skipped in your CI configuration.
      </EmptyStateDescription>
    </EmptyState>
  );
}

export function NoScreenshotsBuildEmptyState() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <ImagesIcon />
      </EmptyStateIcon>
      <Heading>No screenshots found</Heading>
      <EmptyStateDescription>
        Follow one of our quickstart guides to start taking screenshots.
      </EmptyStateDescription>
      <EmptyStateActions>
        <LinkButton href="https://argos-ci.com/docs/quickstart" target="_blank">
          View documentation
        </LinkButton>
      </EmptyStateActions>
    </EmptyState>
  );
}
