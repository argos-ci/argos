import { GitBranchIcon } from "@primer/octicons-react";
import { ExternalLinkIcon, UploadCloudIcon } from "lucide-react";

import { DeploymentsIllustration } from "@/containers/EmptyStateIllustrations";
import { LinkButton } from "@/ui/Button";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
} from "@/ui/Layout";

const DEPLOYMENTS_DOCS_URL = "https://argos-ci.com/docs/learn/deployments";

export function DeploymentsEmptyState(props: {
  hostingEnabled: boolean;
  /** Where the viewer turns hosting on, or `null` when they can't. */
  hostingSettingsUrl: string | null;
}) {
  const { hostingEnabled, hostingSettingsUrl } = props;

  if (!hostingEnabled) {
    return (
      <EmptyState>
        <EmptyStateIllustration>
          <DeploymentsIllustration />
        </EmptyStateIllustration>
        <Heading>Hosting is off</Heading>
        <EmptyStateDescription>
          Turn it on and Argos serves the static sites your CI uploads, like
          Storybook, on their own URLs. Deployments hosted elsewhere show up
          here once your CI reports them.
        </EmptyStateDescription>
        {hostingSettingsUrl ? (
          <EmptyStateActions>
            <LinkButton href={hostingSettingsUrl}>Turn on hosting</LinkButton>
          </EmptyStateActions>
        ) : (
          <EmptyStateDescription className="mt-2">
            Ask a project admin to turn it on.
          </EmptyStateDescription>
        )}
        <EmptyStateLearnMore href={DEPLOYMENTS_DOCS_URL} />
      </EmptyState>
    );
  }

  return (
    <EmptyState>
      <EmptyStateIllustration>
        <DeploymentsIllustration />
      </EmptyStateIllustration>
      <Heading>No deployments yet</Heading>
      <EmptyStateDescription>
        Argos can track where each build was deployed, so a review links
        straight to the running site the screenshots came from.
      </EmptyStateDescription>
      <EmptyStateLearnMore href={DEPLOYMENTS_DOCS_URL} />
      <EmptyStateSteps>
        <EmptyStateStep
          icon={<UploadCloudIcon />}
          step="From your CI"
          title="Report a deployment"
        >
          Tell Argos the URL and environment your branch was deployed to,
          alongside the build it belongs to.
        </EmptyStateStep>
        <EmptyStateStep
          icon={<GitBranchIcon />}
          step="Per branch"
          title="Follow every preview"
        >
          Each branch keeps its own history, so you can see which commit is live
          on a preview and which one is in production.
        </EmptyStateStep>
        <EmptyStateStep
          icon={<ExternalLinkIcon />}
          step="Back here"
          title="Jump to the real page"
        >
          Open the deployed page next to its build, instead of guessing which
          environment a screenshot came from.
        </EmptyStateStep>
      </EmptyStateSteps>
    </EmptyState>
  );
}
