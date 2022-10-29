/* eslint-disable react/no-unescaped-entities */
import { gql } from "@apollo/client";
import { x } from "@xstyled/styled-components";
import { Link, Alert, InlineCode } from "@argos-ci/app/src/components";

export const BuildStatusInfoRepositoryFragment = gql`
  fragment BuildStatusInfoRepositoryFragment on Repository {
    referenceBranch
  }
`;

export const BuildStatusInfoBuildFragment = gql`
  fragment BuildStatusInfoBuildFragment on Build {
    id
    type
    compositeStatus
    batchCount
    totalBatch
    stats {
      screenshotCount
    }
  }
`;

export function getStatusInfoType({
  compositeStatus,
  batchCount,
  totalBatch,
  stats: { screenshotCount },
}) {
  switch (compositeStatus) {
    case "stable":
      return screenshotCount === 0 ? "empty" : "stable";

    case "expired":
      return totalBatch > 0 && batchCount < totalBatch
        ? "expired-for-missing-batch"
        : "expired";

    case "orphan":
    case "reference":
    case "error":
    case "aborted":
      return compositeStatus;

    default:
      return null;
  }
}

export function BuildStatusInfo({ statusInfoType, referenceBranch }) {
  switch (statusInfoType) {
    case "orphan":
      return (
        <>
          Comparing screenshot is not possible because no reference build was
          found.
          <x.div my={4}>
            It may happens because:
            <x.ul listStyleType="disc" ml={8} mt={2}>
              <x.li my={1}>
                There is no Argos build on the{" "}
                <InlineCode>{referenceBranch}</InlineCode> branch yet
              </x.li>
              <x.li my={1}>
                Your pull-request is not rebased on{" "}
                <InlineCode>{referenceBranch}</InlineCode> branch
              </x.li>
            </x.ul>
          </x.div>
          To perform comparison, make sure that you have an Argos build on{" "}
          <InlineCode>{referenceBranch}</InlineCode> branch and that your
          pull-request is rebased.
        </>
      );

    case "reference":
      return "This build was performed on the reference branch. Screenshots will be used as a comparison baseline in next Argos builds";

    case "empty":
      return "Empty build: no screenshot has been uploaded. It may result of a wrong uploaded repository's path.";

    case "stable":
      return "This build is stable: no screenshot change detected.";

    case "expired-for-missing-batch":
      return (
        <>
          Build has been killed because it took too much time to receive all
          batches.
          <br />
          Be sure that argos upload is called up to the number specified in
          parallel total.
        </>
      );

    case "expired":
      return (
        <>
          Build has been killed because it took too much time.
          <br />
          If you are having trouble with this issue reach us on{" "}
          <Link href="https://discord.gg/pK79sv85Vg">Discord</Link>.
        </>
      );

    case "error":
      return (
        <>
          The build failed to be processed.
          <br />
          If you are having trouble with this issue reach us on{" "}
          <Link href="https://discord.gg/pK79sv85Vg">Discord</Link>.
        </>
      );

    case "aborted":
      return "This build has been voluntarily aborted.";

    default:
      return null;
  }
}

function getAlertColor(statusInfoType) {
  switch (statusInfoType) {
    case "orphan":
    case "reference":
      return "info";

    case "error":
    case "expired":
    case "expired-for-missing-batch":
    case "empty":
      return "danger";

    case "stable":
      return "success";

    case "aborted":
    default:
      return "neutral";
  }
}

export function BuildStatusInfoAlert({ referenceBranch, build }) {
  const statusInfoType = getStatusInfoType(build);
  if (!statusInfoType) {
    return null;
  }

  return (
    <Alert mt={2} color={getAlertColor(statusInfoType)}>
      <BuildStatusInfo
        referenceBranch={referenceBranch}
        statusInfoType={statusInfoType}
      />
    </Alert>
  );
}
