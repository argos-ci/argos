import React from "react";
import { x } from "@xstyled/styled-components";
import { GoGitCommit, GoClock, GoGitBranch } from "react-icons/go";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Link,
  IllustratedText,
} from "@argos-ci/app/src/components";
import { getVariantColor } from "../../modules/utils";
import { hasWritePermission } from "../../modules/permissions";
import { UpdateStatusButton } from "./UpdateStatusButton";
import { StatusIcon, statusText } from "../../containers/Status";

export const SummaryCard = React.forwardRef(({ repository, build }, ref) => {
  const statusColor = getVariantColor(build.status);
  const date = new Date(build.createdAt);
  const githubRepoUrl = `https://github.com/${build.repository.owner.login}/${build.repository.name}`;

  return (
    <Card
      borderLeft={2}
      borderLeftColor={statusColor}
      borderRadius="0 md md 0"
      ref={ref}
    >
      <CardHeader>
        <CardTitle>Build Summary</CardTitle>
        {hasWritePermission(repository) && <UpdateStatusButton build={build} />}
      </CardHeader>

      <CardBody display="grid" gridTemplateColumn={{ _: 1, sm: 2 }} gap={1}>
        <IllustratedText icon={GoGitBranch}>
          <Link
            href={`${githubRepoUrl}/${build.compareScreenshotBucket.branch}`}
          >
            {build.compareScreenshotBucket.branch}
          </Link>
        </IllustratedText>

        <x.div
          display="flex"
          alignItems="center"
          gap={1}
          gridColumn={{ sm: 2 }}
        >
          <StatusIcon status={build.status} />
          {statusText(build.status)}
        </x.div>
        <IllustratedText icon={GoGitCommit}>
          <Link
            href={`${githubRepoUrl}/commit/${build.compareScreenshotBucket.commit}`}
          >
            {build.compareScreenshotBucket.commit.split("").slice(0, 7)}
          </Link>
        </IllustratedText>

        <IllustratedText icon={GoClock}>
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </IllustratedText>
      </CardBody>
    </Card>
  );
});
