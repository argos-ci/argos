import React from "react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import {
  CommitIcon,
  ClockIcon,
  GitBranchIcon,
  BookmarkIcon,
} from "@primer/octicons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Link,
  IllustratedText,
} from "@argos-ci/app/src/components";
import {
  UpdateStatusButton,
  UpdateStatusButtonBuildFragment,
} from "./UpdateStatusButton";
import {
  StatusIcon,
  statusText,
  getStatusColor,
} from "../../containers/Status";
import { useParams } from "react-router-dom";

export const SummaryCardFragment = gql`
  fragment SummaryCardFragment on Build {
    createdAt
    name
    compareScreenshotBucket {
      id
      branch
      commit
    }
    status
    ...UpdateStatusButtonBuildFragment
  }

  ${UpdateStatusButtonBuildFragment}
`;

const BranchNameField = ({ build, ...props }) => {
  const { ownerLogin, repositoryName } = useParams();

  return (
    <IllustratedText field icon={GitBranchIcon} {...props}>
      <Link
        href={`https://github.com/${ownerLogin}/${repositoryName}/${build.compareScreenshotBucket.branch}`}
      >
        {build.compareScreenshotBucket.branch}
      </Link>
    </IllustratedText>
  );
};

const CommitFields = ({ build, ...props }) => {
  const { ownerLogin, repositoryName } = useParams();

  return (
    <IllustratedText field icon={CommitIcon} {...props}>
      <Link
        href={`https://github.com/${ownerLogin}/${repositoryName}/commit/${build.compareScreenshotBucket.commit}`}
      >
        {build.compareScreenshotBucket.commit.split("").slice(0, 7)}
      </Link>
    </IllustratedText>
  );
};

export function StickySummaryMenu({ repository, build, ...props }) {
  const { ownerLogin, repositoryName } = useParams();
  const githubRepoUrl = `https://github.com/${ownerLogin}/${repositoryName}`;

  return (
    <x.div
      position="sticky"
      top={0}
      zIndex={200}
      backgroundColor="highlight-background"
      borderLeft={3}
      borderColor={getStatusColor(build.status)}
      borderBottom={1}
      borderBottomColor="border"
      display="flex"
      justifyContent="space-between"
      pl={2}
      py={1}
      gap={4}
      {...props}
    >
      <x.div display="flex" gap={2}>
        <IllustratedText
          icon={GitBranchIcon}
          field
          overflow="hidden"
          fontSize="lg"
          lineHeight={8}
        >
          <Link
            href={`${githubRepoUrl}/${build.compareScreenshotBucket.branch}`}
            whiteSpace="nowrap"
            textOverflow="ellipsis"
            overflow="hidden"
          >
            {build.compareScreenshotBucket.branch}
          </Link>
        </IllustratedText>
        {build.name === "default" && (
          <IllustratedText
            icon={BookmarkIcon}
            color="secondary-text"
            field
            gap={1}
            fontSize="sm"
          >
            {build.name}
          </IllustratedText>
        )}
      </x.div>

      <UpdateStatusButton repository={repository} build={build} flex={1} />
    </x.div>
  );
}

export function SummaryCard({ build }) {
  const statusColor = getStatusColor(build.status);
  const date = new Date(build.createdAt);

  return (
    <Card borderLeft={2} borderLeftColor={statusColor} borderRadius="0 md md 0">
      <CardHeader>
        <CardTitle>
          <BranchNameField build={build} />
        </CardTitle>
      </CardHeader>

      <CardBody display="grid" gridTemplateColumns={{ _: 1, sm: 2 }} gap={1}>
        <IllustratedText field icon={ClockIcon}>
          {date.toLocaleDateString()} at {date.toLocaleTimeString()}
        </IllustratedText>

        <x.div display="flex" alignItems="center" gap={2}>
          <StatusIcon status={build.status} />
          {statusText(build.status)}
        </x.div>

        {build.name !== "default" ? (
          <IllustratedText field icon={BookmarkIcon}>
            {build.name}
          </IllustratedText>
        ) : null}

        <CommitFields build={build} />
      </CardBody>
    </Card>
  );
}
