import { DocumentType, graphql } from "@/gql";
import { DeploymentStatus } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";

const _BuildFragment = graphql(`
  fragment DeploymentSection_Build on Build {
    deployment {
      id
      url
      status
      environment
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;

const deploymentStatusChips: Record<
  DeploymentStatus,
  { label: string; color: "success" | "pending" | "danger" }
> = {
  [DeploymentStatus.Ready]: { label: "Deployed", color: "success" },
  [DeploymentStatus.Pending]: { label: "Deploying", color: "pending" },
  [DeploymentStatus.Error]: { label: "Failed", color: "danger" },
};

/**
 * Links the build to its matching deployment when one exists, otherwise nudges
 * the user to set up Storybook deployments for better discoverability.
 */
export function DeploymentSection(props: { build: Build }) {
  const { deployment } = props.build;
  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Deployment</PanelTitle>
      </PanelHeader>
      <div className="px-4">
        {deployment ? (
          <div className="flex flex-col items-start gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Chip
                scale="xs"
                color={deploymentStatusChips[deployment.status].color}
              >
                {deploymentStatusChips[deployment.status].label}
              </Chip>
              <span className="text-low">
                {deployment.environment === "production"
                  ? "Production"
                  : "Preview"}
              </span>
            </div>
            <div className="max-w-full min-w-0 truncate">
              <Link href={deployment.url} external target="_blank">
                {deployment.url}
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm">
            <Link
              href="https://argos-ci.com/docs/learn/deployments"
              external
              target="_blank"
            >
              Set up Storybook deployments
            </Link>
          </p>
        )}
      </div>
    </Panel>
  );
}
