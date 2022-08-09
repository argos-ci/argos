import { getInstallationOctokit } from "@argos-ci/github";
import { runAfterTransaction } from "@argos-ci/database";
import { BuildNotification } from "@argos-ci/database/models";
import { job as buildNotificationJob } from "./job";

async function getNotificationPayload(buildNotification) {
  switch (buildNotification.type) {
    case "queued":
      return {
        state: "pending",
        description: "Build is queued",
      };
    case "progress":
      return {
        state: "pending",
        description: "Build in progress...",
      };
    case "no-diff-detected":
      return {
        state: "success",
        description: "Everything's good!",
      };
    case "diff-detected": {
      const diffsCount = await buildNotification.build
        .$relatedQuery("screenshotDiffs")
        .where("score", ">", 0)
        .resultSize();
      return {
        state: "failure",
        description: `${diffsCount} difference${
          diffsCount > 1 ? "s" : ""
        } detected, waiting for your decision`,
      };
    }
    case "diff-accepted":
      return {
        state: "success",
        description: "Difference accepted",
      };
    case "diff-rejected":
      return {
        state: "failure",
        description: "Difference rejected",
      };
    default:
      throw new Error(`Unknown notification type: ${buildNotification.type}`);
  }
}

export async function pushBuildNotification({ type, buildId, trx }) {
  const buildNotification = await BuildNotification.query(trx).insert({
    buildId,
    type,
    jobStatus: "pending",
  });
  runAfterTransaction(trx, () => {
    buildNotificationJob.push(buildNotification.id);
  });
  return buildNotification;
}

export async function processBuildNotification(buildNotification) {
  await buildNotification.$fetchGraph(
    `build.[repository.installations, compareScreenshotBucket]`
  );

  const { build } = buildNotification;

  if (!build) {
    throw new Error("Build not found");
  }

  // Skip sample build
  if (build.number === 0) {
    return null;
  }

  const notification = await getNotificationPayload(buildNotification);
  const owner = await build.repository.$relatedOwner();

  if (!owner) {
    throw new Error("Owner not found");
  }

  const [installation] = build.repository.installations;
  if (!installation) {
    throw new Error(
      `Installation not found for repository "${build.repository.id}"`
    );
  }

  const octokit = await getInstallationOctokit(installation.githubId);

  // If we don't get an octokit, then the installation has been removed
  // we deleted the installation
  if (!octokit) {
    await installation.$query().patch({ deleted: true });
    return null;
  }

  const buildUrl = await build.getUrl();

  // https://developer.github.com/v3/repos/statuses/
  return octokit.repos.createCommitStatus({
    owner: owner.login,
    repo: build.repository.name,
    sha: build.compareScreenshotBucket.commit,
    state: notification.state,
    target_url: buildUrl,
    description: notification.description, // Short description of the status.
    context: build.name === "default" ? "argos" : `argos/${build.name}`,
  });
}
