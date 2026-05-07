import { assertNever } from "@argos/util/assertNever";

import type { DeploymentNotification, Project } from "@/database/models";

export type DeploymentNotificationPayload = {
  description: string;
  context: string;
  github: {
    state: "pending" | "success";
  };
};

export function getDeploymentNotificationPayload(input: {
  deploymentNotification: Pick<DeploymentNotification, "type">;
  project: Pick<Project, "name">;
}): DeploymentNotificationPayload {
  const { deploymentNotification, project } = input;

  switch (deploymentNotification.type) {
    case "progress":
      return {
        context: `argos-deploy/${project.name}`,
        description: "Deployment in progress",
        github: { state: "pending" },
      };
    case "success":
      return {
        context: `argos-deploy/${project.name}`,
        description: "Deployment ready",
        github: { state: "success" },
      };
    default:
      assertNever(deploymentNotification.type);
  }
}
