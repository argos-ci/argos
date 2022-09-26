/* eslint-disable react/no-unescaped-entities */
import * as React from "react";
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
    status
    number
    batchCount
    totalBatch
  }
`;

export const BuildStatusInfoScreenshotDiffResultFragment = gql`
  fragment BuildStatusInfoScreenshotDiffResultFragment on ScreenshotDiffResult {
    pageInfo {
      totalCount
    }
  }
`;

function FirstBuildMessage({ firstBuild }) {
  return firstBuild ? (
    <x.div mb={3} fontWeight={600}>
      Congratulation for your first build!
    </x.div>
  ) : null;
}

function OrphanTypeInfo({ firstBuild, referenceBranch }) {
  return (
    <Alert mt={2} severity="info">
      <FirstBuildMessage firstBuild={firstBuild} />
      Comparing screenshot is not possible because no reference build was found.
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
    </Alert>
  );
}

function ReferenceTypeInfo({ firstBuild }) {
  return (
    <Alert mt={2} severity="info">
      <FirstBuildMessage firstBuild={firstBuild} />
      This build was performed on the reference branch. Screenshots will be used
      as a comparison baseline in next Argos builds.
    </Alert>
  );
}

function StableStatusInfo({ screenshotsTotalCount }) {
  return screenshotsTotalCount === 0 ? (
    <Alert mt={2} severity="danger">
      This build is empty: no screenshot has been uploaded. It may result of a
      configuration issue.
    </Alert>
  ) : (
    <Alert mt={2} severity="success">
      This build is stable: no screenshot change detected.
    </Alert>
  );
}

function ExpiredStatusInfo({ batchCount, totalBatch }) {
  return totalBatch > 0 && batchCount < totalBatch ? (
    <Alert mt={2} severity="danger">
      Build has been killed because it took too much time to receive all
      batches. Be sure that argos upload is called up to the number specified in
      parallel total. <a>Read more about parallel troubleshooting</a>.
    </Alert>
  ) : (
    <Alert mt={2} severity="danger">
      Build has been killed because it took too much time. If you are having
      trouble with this issue, reach us on{" "}
      <Link href="https://discord.gg/pK79sv85Vg">Discord</Link>.
    </Alert>
  );
}

function CheckTypeInfo({
  build: { status, batchCount, totalBatch },
  screenshotCount,
}) {
  switch (status) {
    case "stable":
      return <StableStatusInfo screenshotsTotalCount={screenshotCount} />;

    case "error":
      return (
        <Alert mt={2} severity="danger">
          The build failed to be processed. If you are having trouble with this
          issue, reach us on{" "}
          <Link href="https://discord.gg/pK79sv85Vg">Discord</Link>.
        </Alert>
      );

    case "aborted":
      return (
        <Alert mt={2} severity="neutral">
          This build has been voluntarily aborted.
        </Alert>
      );

    case "expired":
      return (
        <ExpiredStatusInfo batchCount={batchCount} totalBatch={totalBatch} />
      );

    default:
      return null;
  }
}

export function BuildStatusInfo({ build, referenceBranch, screenshotCount }) {
  const buildIsFirst = build.number === 1;

  switch (build.type) {
    case "orphan":
      return (
        <OrphanTypeInfo
          firstBuild={buildIsFirst}
          referenceBranch={referenceBranch}
        />
      );

    case "reference":
      return <ReferenceTypeInfo firstBuild={buildIsFirst} />;

    case "check":
      return <CheckTypeInfo build={build} screenshotCount={screenshotCount} />;

    default:
      return null;
  }
}
