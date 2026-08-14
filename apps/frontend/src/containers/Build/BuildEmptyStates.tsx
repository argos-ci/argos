import { ImagesIcon, SquareSlashIcon } from "lucide-react";

import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import { EmptyState, EmptyStateActions, EmptyStateIcon } from "@/ui/Layout";
import { Text } from "@/ui/Text";

export function SkippedBuildEmptyState() {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <SquareSlashIcon />
      </EmptyStateIcon>
      <Heading>Skipped build</Heading>
      <Text slot="description">
        This build has been skipped in your CI configuration.
      </Text>
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
      <Text slot="description">
        Follow one of our quickstart guides to start taking screenshots.
      </Text>
      <EmptyStateActions>
        <LinkButton href="https://argos-ci.com/docs/quickstart" target="_blank">
          View documentation
        </LinkButton>
      </EmptyStateActions>
    </EmptyState>
  );
}
