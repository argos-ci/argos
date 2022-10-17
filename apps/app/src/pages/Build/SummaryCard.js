import * as React from "react";
import { useParams } from "react-router-dom";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import {
  CommitIcon,
  ClockIcon,
  GitBranchIcon,
  BookmarkIcon,
  FileZipIcon,
} from "@primer/octicons-react";
import {
  Card,
  CardBody,
  Link,
  IllustratedText,
  Time,
  ProgressBar,
} from "@argos-ci/app/src/components";
import {
  ReviewButton,
  ReviewButtonBuildFragment,
  ReviewButtonRepositoryFragment,
} from "./ReviewButton";
import { getStatusPrimaryColor } from "../../containers/Status";
import { BuildStatusBadge } from "../../containers/BuildStatusBadge";
import { ShowChangesButton } from ".";

export const SummaryCardBuildFragment = gql`
  fragment SummaryCardBuildFragment on Build {
    createdAt
    name
    number
    status
    type
    batchCount
    totalBatch
    compareScreenshotBucket {
      id
      branch
      commit
    }
    ...ReviewButtonBuildFragment
  }
  ${ReviewButtonBuildFragment}
`;

export const SummaryCardRepositoryFragment = gql`
  fragment SummaryCardRepositoryFragment on Repository {
    id
    ...ReviewButtonRepositoryFragment
  }
  ${ReviewButtonRepositoryFragment}
`;

const BranchNameField = ({ build, ...props }) => {
  const { ownerLogin, repositoryName } = useParams();

  return (
    <IllustratedText field icon={GitBranchIcon} {...props}>
      <Link
        href={`https://github.com/${ownerLogin}/${repositoryName}/tree/${build.compareScreenshotBucket.branch}`}
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

export function StickySummaryMenu({
  repository,
  build,
  screenshotDiffsCount,
  showChanges,
  setShowChanges,
  updatedScreenshotCount,
  ...props
}) {
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
      minH={10}
      {...props}
    >
      <x.div
        display="flex"
        justifyContent="space-between"
        gap={4}
        px={2}
        py={1}
        overflowX="auto"
      >
        <x.div display="flex" gap={3} alignItems="center" flexShrink={0}>
          Build #{build.number}
          <BuildStatusBadge build={build} py={0.5} />
        </x.div>
        <x.div flex={1}>
          {updatedScreenshotCount > 0 ? (
            <ShowChangesButton
              showChanges={showChanges}
              setShowChanges={setShowChanges}
            />
          ) : null}
        </x.div>
        <x.div flex={1}>
          <ReviewButton repository={repository} />
        </x.div>
      </x.div>
    </x.div>
  );
}

function ProgressField({ build: { batchCount, totalBatch } }) {
  if (batchCount === totalBatch) {
    return (
      <IllustratedText field icon={FileZipIcon} color="primary-text">
        All batches received
      </IllustratedText>
    );
  }

  return (
    <x.div maxW={250}>
      <x.div display="flex" justifyContent="space-between">
        <IllustratedText field icon={FileZipIcon}>
          Batch received
        </IllustratedText>
        <div>
          {batchCount} / {totalBatch}
        </div>
      </x.div>
      <ProgressBar score={batchCount} total={totalBatch} mt={1} />
    </x.div>
  );
}

export const SummaryCard = React.forwardRef(({ build }, ref) => (
  <Card ref={ref}>
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

      {build.totalBatch ? <ProgressField build={build} /> : null}
    </CardBody>
  </Card>
));
