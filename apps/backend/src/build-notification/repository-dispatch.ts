import { invariant } from "@argos/util/invariant";

import { UnretryableError } from "@/job-core";

import type { SendNotificationContext } from "./context";

export type BuildRepositoryDispatchPayload = {
  event_type: `argos.build.${string}`;
  client_payload: {
    argos: {
      type: "build";
      action: SendNotificationContext["buildNotification"]["type"];
      build: {
        id: string;
        number: number;
        name: string;
        type: string | null;
        status: SendNotificationContext["buildNotification"]["type"];
        conclusion: string | null;
        url: string;
        commit: string;
        branch: string | null;
        baseCommit: string | null;
        baseBranch: string | null;
        prNumber: number | null;
        prHeadCommit: string | null;
      };
      project: {
        id: string;
        name: string;
        url: string;
      };
    };
  };
};

/**
 * Build the GitHub repository dispatch payload for a build notification.
 */
export async function getBuildRepositoryDispatch(
  ctx: SendNotificationContext,
): Promise<BuildRepositoryDispatchPayload> {
  const { build, buildNotification, commit, buildUrl, projectUrl } = ctx;
  const { project, compareScreenshotBucket } = build;

  invariant(project, "No project found", UnretryableError);
  invariant(
    compareScreenshotBucket,
    "No compare screenshot bucket found",
    UnretryableError,
  );

  return {
    event_type: `argos.build.${buildNotification.type}`,
    client_payload: {
      argos: {
        type: "build",
        action: buildNotification.type,
        build: {
          id: build.id,
          number: build.number,
          name: build.name,
          type: build.type,
          status: buildNotification.type,
          conclusion: build.conclusion,
          url: buildUrl,
          commit,
          branch: compareScreenshotBucket.branch,
          baseCommit: build.baseCommit,
          baseBranch: build.baseBranch,
          prNumber: build.prNumber,
          prHeadCommit: build.prHeadCommit,
        },
        project: {
          id: project.id,
          name: project.name,
          url: projectUrl,
        },
      },
    },
  };
}
