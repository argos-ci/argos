import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";

import { Button, Loader, SecondaryTitle } from "@argos-ci/app/src/components";

import {
  ScreenshotsDiffCard,
  ScreenshotsDiffCardFragment,
} from "./ScreenshotsDiffCard";

export const ScreenshotDiffsPageFragment = gql`
  fragment ScreenshotDiffsPageFragment on ScreenshotDiffResult {
    pageInfo {
      totalCount
      hasNextPage
      endCursor
    }
    edges {
      id
      score
      status

      ...ScreenshotsDiffCardFragment
    }
  }
  ${ScreenshotsDiffCardFragment}
`;

export function fetchMoreScreenshotDiffs({ data, fetchMore }) {
  return fetchMore({
    variables: {
      offset: data.repository.build.screenshotDiffs.pageInfo.endCursor,
    },
    updateQuery: (prev, { fetchMoreResult }) => {
      if (!fetchMoreResult) return prev;

      return {
        ...prev,
        repository: {
          ...prev.repository,
          build: {
            ...prev.repository.build,
            screenshotDiffs: {
              ...fetchMoreResult.repository.build.screenshotDiffs,
              edges: [
                ...prev.repository.build.screenshotDiffs.edges,
                ...fetchMoreResult.repository.build.screenshotDiffs.edges,
              ],
            },
          },
        },
      };
    },
  });
}

export function LoadMoreButton({ onClick, moreLoading }) {
  return (
    <Button mt={4} mx="auto" onClick={onClick} disabled={moreLoading}>
      Load More {moreLoading && <Loader maxH={4} />}
    </Button>
  );
}

export function ScreenshotDiffsSection({
  title,
  screenshotDiffs,
  color = "primary-text",
  opened = "true",
  showChanges,
}) {
  if (screenshotDiffs.length === 0) return null;

  return (
    <>
      <SecondaryTitle mt={6} color={color}>
        {title}
      </SecondaryTitle>
      <x.div display="flex" flexDirection="column" gap={2}>
        {screenshotDiffs.map((screenshotDiff, index) => (
          <ScreenshotsDiffCard
            key={index}
            screenshotDiff={screenshotDiff}
            opened={opened}
            showChanges={showChanges}
          />
        ))}
      </x.div>
    </>
  );
}
