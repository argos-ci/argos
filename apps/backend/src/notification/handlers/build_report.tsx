import React from "react";

import { EmailLayout } from "@/notification/email-components"; // Assuming this exists

import type { Handler, HandlerContext } from "./index";
import type { NotificationWorkflowData } from "../workflow-types";

const sampleBuildStats = {
  total: 100,
  added: 5,
  removed: 2,
  changed: 10,
  unchanged: 83,
};

export const previewData: NotificationWorkflowData['build_report'] = {
  projectId: "sample-project-id",
  buildId: "sample-build-id",
  buildName: "feat: Add new button (#123)",
  buildUrl: "/sample-org/sample-project/builds/123", // Example relative URL
  buildType: "check",
  conclusion: "changes-detected",
  stats: sampleBuildStats,
  projectName: "Sample Project",
  projectSlug: "sample-org",
  isReferenceBuild: false,
};

export const email = ({
  buildName,
  buildUrl,
  conclusion,
  stats,
  projectName,
  projectSlug,
  ctx,
}: NotificationWorkflowData['build_report'] & { ctx: HandlerContext }) => {
  let subject = "";
  let title = "";

  switch (conclusion) {
    case "changes-detected":
      subject = `Changes detected in build for ${projectName}`;
      title = `Build Report: ${stats.changed} changes detected`;
      break;
    case "no-changes":
      subject = `No changes in build for ${projectName}`;
      title = `Build Report: No visual changes detected`;
      break;
    default:
      subject = `Build report for ${projectName}`;
      title = `Build Report: ${projectName}`;
  }

  return {
    subject,
    body: (
      <EmailLayout
        title={title}
        hello={ctx.user.name ? `Hello ${ctx.user.name},` : "Hello,"}
        footer="This is an automated build report."
      >
        <p>
          Build <strong>{buildName}</strong> for project{" "}
          <strong>
            {projectSlug}/{projectName}
          </strong>{" "}
          has concluded.
        </p>
        <p>
          <strong>Conclusion:</strong> {conclusion}
        </p>
        <p>
          <strong>Stats:</strong>
          <br />
          - Total Screenshots: {stats.total}
          <br />
          - Added: {stats.added}
          <br />
          - Removed: {stats.removed}
          <br />
          - Changed: {stats.changed}
        </p>
        <p>
          <a href={buildUrl}>View Build Details</a>
        </p>
      </EmailLayout>
    ),
  };
};

export default {
  previewData,
  email,
} satisfies Handler<"build_report">;
