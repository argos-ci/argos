import * as React from "react";
import { useParams } from "react-router-dom";
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
  CardBody,
  Link,
  IllustratedText,
  Time,
} from "@argos-ci/app/src/components";
import {
  UpdateStatusButton,
  UpdateStatusButtonBuildFragment,
} from "./UpdateStatusButton";
import {
  getBuildStatusLabel,
  getStatusPrimaryColor,
} from "../../containers/Status";
import { BuildStatusBadge } from "../../containers/BuildStatusBadge";

export const SummaryCardFragment = gql`
  fragment SummaryCardFragment on Build {
    createdAt
    name
    number
    status
    type
    compareScreenshotBucket {
      id
      branch
      commit
    }
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
  return (
    <x.div
      position="sticky"
      top={0}
      zIndex={200}
      backgroundColor="highlight-background"
      borderLeft={3}
      borderColor={getStatusPrimaryColor(build.status)}
      borderBottom={1}
      borderBottomColor="border"
      display="flex"
      justifyContent="space-between"
      pl={2}
      py={1}
      gap={4}
      {...props}
    >
      <x.div display="flex" gap={3} alignItems="center">
        Build #{build.number}
        <BuildStatusBadge build={build} py={0.5}>
          {getBuildStatusLabel(build.status)}
        </BuildStatusBadge>
      </x.div>

      <UpdateStatusButton repository={repository} build={build} flex={1} />
    </x.div>
  );
}

export function SummaryCard({ build }) {
  return (
    <Card>
      <CardBody display="grid" gridTemplateColumns={{ _: 1, sm: 2 }} gap={1}>
        <IllustratedText field icon={ClockIcon}>
          <Time date={build.createdAt} format="LLL" />
        </IllustratedText>

        <BranchNameField build={build} />

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
