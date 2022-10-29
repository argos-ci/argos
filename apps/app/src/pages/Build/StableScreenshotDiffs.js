import { gql } from "graphql-tag";
import { LoadingAlert } from "@argos-ci/app/src/components";
import { useQuery } from "../../containers/Apollo";
import {
  fetchMoreScreenshotDiffs,
  LoadMoreButton,
  ScreenshotDiffsPageFragment,
  ScreenshotDiffsSection,
} from "./ScreenshotDiffsSection";
import { useState } from "react";

const BUILD_STABLE_SCREENSHOT_DIFFS_QUERY = gql`
  query BUILD_STABLE_SCREENSHOT_DIFFS_QUERY(
    $ownerLogin: String!
    $repositoryName: String!
    $buildNumber: Int!
    $offset: Int!
    $limit: Int!
  ) {
    repository(ownerLogin: $ownerLogin, repositoryName: $repositoryName) {
      id
      build(number: $buildNumber) {
        id
        screenshotDiffs(
          offset: $offset
          limit: $limit
          where: { passing: true }
        ) {
          ...ScreenshotDiffsPageFragment
        }
      }
    }
  }

  ${ScreenshotDiffsPageFragment}
`;

export function StableScreenshots({ ownerLogin, repositoryName, buildNumber }) {
  const { loading, data, fetchMore } = useQuery(
    BUILD_STABLE_SCREENSHOT_DIFFS_QUERY,
    {
      variables: {
        ownerLogin,
        repositoryName,
        buildNumber,
        offset: 0,
        limit: 10,
      },
      skip: !ownerLogin || !repositoryName || !buildNumber,
    }
  );
  const [moreLoading, setMoreLoading] = useState();

  function loadNextPage() {
    setMoreLoading(true);
    fetchMoreScreenshotDiffs({ data, fetchMore }).finally(() => {
      setMoreLoading(false);
    });
  }

  if (loading || !data) return <LoadingAlert />;

  const {
    build: {
      screenshotDiffs: { pageInfo, edges: screenshotDiffs },
    },
  } = data.repository;

  return (
    <>
      <ScreenshotDiffsSection
        title="Stable Screenshots"
        screenshotDiffs={screenshotDiffs}
        opened={false}
      />

      {pageInfo.hasNextPage && (
        <LoadMoreButton onClick={loadNextPage} moreLoading={moreLoading} />
      )}
    </>
  );
}
