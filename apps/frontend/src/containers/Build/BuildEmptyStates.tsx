import { ImagesIcon, SquareSlashIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";

import { LinkButton } from "@/ui/Button";
import { EmptyState, EmptyStateActions, EmptyStateIcon } from "@/ui/Layout";

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
        <LinkButton
          href="https://argos-ci.com/docs/getting-started"
          target="_blank"
        >
          View documentation
        </LinkButton>
      </EmptyStateActions>
    </EmptyState>
  );
}
