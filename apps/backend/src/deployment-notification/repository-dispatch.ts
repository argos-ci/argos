import type {
  Deployment,
  DeploymentNotification,
  Project,
} from "@/database/models";

export type DeploymentRepositoryDispatchPayload = {
  event_type: `argos.deployment.${DeploymentNotification["type"]}`;
  client_payload: {
    argos: {
      type: "deployment";
      action: DeploymentNotification["type"];
      deployment: {
        id: string;
        status: string;
        url: string;
        environment: string;
        branch: string;
        commit: string;
        prNumber: number | null;
      };
      project: {
        id: string;
        name: string;
      };
    };
  };
};

/**
 * Build the GitHub repository dispatch payload for a deployment notification.
 */
export function getDeploymentRepositoryDispatch(input: {
  deploymentNotification: Pick<DeploymentNotification, "type">;
  deployment: Deployment & {
    pullRequest?: { number: number } | null;
  };
  project: Pick<Project, "id" | "name">;
}): DeploymentRepositoryDispatchPayload {
  const { deploymentNotification, deployment, project } = input;
  return {
    event_type: `argos.deployment.${deploymentNotification.type}`,
    client_payload: {
      argos: {
        type: "deployment",
        action: deploymentNotification.type,
        deployment: {
          id: deployment.id,
          status: deployment.status,
          url: deployment.url,
          environment: deployment.environment,
          branch: deployment.branch,
          commit: deployment.commitSha,
          prNumber: deployment.pullRequest?.number ?? null,
        },
        project: {
          id: project.id,
          name: project.name,
        },
      },
    },
  };
}
