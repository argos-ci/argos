import type { DeploymentEnvironment } from "@argos/schemas/deployment";
import type { WithGraphModel } from "objection";
import { z } from "zod";

import type { AuthProjectSource } from "@/auth/payload";
import { Deployment, type Project } from "@/database/models";
import { pushDeploymentNotification } from "@/deployment-notification";
import { trySendProjectEvent } from "@/event/send";

/**
 * The URL of a deployment hosted elsewhere. Rejects `localhost` and IP
 * addresses, whose links would lead nowhere for anyone else.
 */
export const ExternalDeploymentUrlSchema = z
  .httpUrl({ normalize: true })
  .max(2048);

/**
 * Record a deployment hosted elsewhere. There is nothing to upload, so it is
 * ready at once.
 */
export async function createExternalDeployment(input: {
  project: WithGraphModel<Project, "account">;
  /** Parsed with `ExternalDeploymentUrlSchema`. */
  url: string;
  environment: DeploymentEnvironment;
  branch: string;
  commitSha: string;
  prHeadCommit: string | null;
  githubPullRequestId: string | null;
  authSource: AuthProjectSource;
}): Promise<Deployment> {
  const { project, url, ...data } = input;

  const deployment = await Deployment.query().insertAndFetch({
    ...data,
    projectId: project.id,
    status: "ready",
    externalUrl: url,
    slug: null,
  });

  await Promise.all([
    pushDeploymentNotification({
      deploymentId: deployment.id,
      type: "success",
    }),
    trySendProjectEvent({
      name: "deployment.created",
      deployment,
      project,
    }).then(() =>
      trySendProjectEvent({
        name: "deployment.ready",
        deployment,
        project,
      }),
    ),
  ]);

  return deployment;
}
