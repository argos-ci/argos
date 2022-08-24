import React from "react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
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
import {
  UpdateStatusButton,
  UpdateStatusButtonFragment,
} from "./UpdateStatusButton";
import { StatusIcon, statusText } from "../../containers/Status";
import { useParams } from "react-router-dom";

export const SummaryCardRepositoryFragment = gql`
  fragment SummaryCardRepositoryFragment on Repository {
    permissions
  }

  ${UpdateStatusButtonFragment}
`;

export const SummaryCardBuildFragment = gql`
  fragment SummaryCardBuildFragment on Build {
    createdAt
    compareScreenshotBucket {
      id
      branch
      commit
    }
    status
    ...UpdateStatusButtonFragment
  }

  ${UpdateStatusButtonFragment}
`;

export function StickySummaryMenu({ repository, build, ...props }) {
  const { ownerLogin, repositoryName } = useParams();
  const githubRepoUrl = `https://github.com/${ownerLogin}/${repositoryName}`;

  return (
    <x.div
      position="sticky"
      top={0}
      zIndex={200}
      backgroundColor="background"
      borderLeft={3}
      borderColor={getVariantColor(build.status)}
      {...props}
    >
      <x.div
        display="flex"
        justifyContent="space-between"
        pl={2}
        py={1}
        gap={4}
      >
        <IllustratedText icon={GoGitBranch} overflow="hidden">
          <Link
            href={`${githubRepoUrl}/${build.compareScreenshotBucket.branch}`}
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            overflow="hidden"
          >
            {build.compareScreenshotBucket.branch}
          </Link>
        </IllustratedText>
        {hasWritePermission(repository) && (
          <UpdateStatusButton build={build} flex={1} />
        )}
      </x.div>
    </x.div>
  );
}

export function SummaryCard({ repository, build }) {
  const { ownerLogin, repositoryName } = useParams();
  const statusColor = getVariantColor(build.status);
  const date = new Date(build.createdAt);
  const githubRepoUrl = `https://github.com/${ownerLogin}/${repositoryName}`;

  return (
    <Card borderLeft={2} borderLeftColor={statusColor} borderRadius="0 md md 0">
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
}
