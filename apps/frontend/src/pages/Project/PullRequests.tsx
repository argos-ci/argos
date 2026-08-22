import { useEffect, useRef, useState, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { GitPullRequestIcon } from "@primer/octicons-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FilmIcon } from "lucide-react";

import { PullRequestButton } from "@/containers/PullRequestButton";
import { DocumentType, graphql } from "@/gql";
import { Chip, ChipLink } from "@/ui/Chip";
import { Heading } from "@/ui/Heading";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { List, ListRow, ListRowLoader } from "@/ui/List";
import { RouterLink } from "@/ui/RouterLink";
import { Text } from "@/ui/Text";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import { getBuildDescriptor } from "@/util/build";

import { getBuildURL } from "../Build/BuildParams";
import { NotFound } from "../NotFound";
import { useProjectParams, type ProjectParams } from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const ProjectPullRequestsQuery = graphql(`
  query ProjectPullRequests_project(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      pullRequests(first: $first, after: $after) {
        pageInfo {
          isEmpty
          hasNextPage
        }
        edges {
          id
          pullRequest {
            id
            number
            title
            date
            ...PullRequestButton_PullRequest
          }
          builds {
            id
            number
            name
            type
            status
          }
          medias {
            id
            name
            state
            shareToken
            latestVersion {
              id
              fileUrl
              posterUrl
              isVideo
            }
          }
        }
      }
    }
  }
`);

type ProjectPullRequestsDocument = DocumentType<
  typeof ProjectPullRequestsQuery
>;
type PullRequests = NonNullable<
  ProjectPullRequestsDocument["project"]
>["pullRequests"];
type PullRequestEdge = PullRequests["edges"][0];

/**
 * How many of a row's builds get a chip. The rest collapse into a "+N" —
 * a pull request accumulates a build per push, and the row is an overview,
 * not the build history (the Builds tab is).
 */
const MAX_VISIBLE_BUILDS = 3;

/** How many of a row's media get a thumbnail before collapsing into "+N". */
const MAX_VISIBLE_MEDIAS = 4;

function BuildChips(props: {
  builds: PullRequestEdge["builds"];
  params: ProjectParams;
}) {
  const { builds, params } = props;
  if (builds.length === 0) {
    return null;
  }
  const visible = builds.slice(0, MAX_VISIBLE_BUILDS);
  const hiddenCount = builds.length - visible.length;
  return (
    <>
      {visible.map((build) => {
        const descriptor = getBuildDescriptor(build.type, build.status);
        return (
          <Tooltip key={build.id} content={descriptor.label}>
            <ChipLink
              href={getBuildURL({ ...params, buildNumber: build.number })}
              icon={descriptor.icon}
              color={descriptor.color}
              scale="sm"
              className="max-w-28 shrink-0"
            >
              #{build.number}
              {build.name !== "default" ? ` ${build.name}` : null}
            </ChipLink>
          </Tooltip>
        );
      })}
      {hiddenCount > 0 && (
        <Tooltip
          content={`${hiddenCount} more build${hiddenCount === 1 ? "" : "s"} on this pull request`}
        >
          <Chip color="neutral" scale="sm" className="shrink-0">
            +{hiddenCount}
          </Chip>
        </Tooltip>
      )}
    </>
  );
}

function MediaThumbnail(props: {
  version: PullRequestEdge["medias"][0]["latestVersion"];
}) {
  const { version } = props;
  const [posterFailed, setPosterFailed] = useState(false);
  // Decorative: the tooltip on the link spells out the media's name.
  const imgProps = { alt: "", className: "size-full object-cover" };

  if (version.isVideo) {
    // A recording with no frame to show: the film icon says what it is, where
    // a broken image would only say something went wrong.
    if (!version.posterUrl || posterFailed) {
      return <FilmIcon className="text-low size-5" />;
    }
    // The poster is already a CDN-transformed frame of the video; appending
    // more transformations to it would stack a second set onto the URL.
    return (
      <img
        src={version.posterUrl}
        onError={() => setPosterFailed(true)}
        {...imgProps}
      />
    );
  }

  return (
    <ImageKitPicture
      key={version.fileUrl}
      src={version.fileUrl}
      transformations={["w-96", "h-96", "c-at_max", "dpr-2"]}
      {...imgProps}
    />
  );
}

function MediaThumbnails(props: { medias: PullRequestEdge["medias"] }) {
  const { medias } = props;
  if (medias.length === 0) {
    return null;
  }
  const visible = medias.slice(0, MAX_VISIBLE_MEDIAS);
  const hiddenCount = medias.length - visible.length;
  return (
    <>
      {visible.map((media) => {
        // The two halves of a pair share a name; the state is what tells the
        // links — and their tooltips — apart.
        const label = media.state
          ? `${media.name} (${media.state})`
          : media.name;
        return (
          <Tooltip key={media.id} content={label}>
            <RouterLink
              href={`/m/${media.shareToken}`}
              aria-label={label}
              className="bg-subtle border-thin hover:border-hover flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm"
            >
              <MediaThumbnail version={media.latestVersion} />
            </RouterLink>
          </Tooltip>
        );
      })}
      {hiddenCount > 0 && (
        <Tooltip content={`${hiddenCount} more media on this pull request`}>
          <div className="bg-subtle border-thin text-low flex size-12 shrink-0 items-center justify-center rounded-sm text-xs">
            +{hiddenCount}
          </div>
        </Tooltip>
      )}
    </>
  );
}

function PullRequestRow(props: {
  edge: PullRequestEdge;
  params: ProjectParams;
  style: React.CSSProperties;
}) {
  const { edge, params, style } = props;
  return (
    <ListRow className="flex items-center gap-6 p-4 text-sm" style={style}>
      {/* The title takes the slack; the other columns are fixed so they line
          up from row to row, and drop out as the viewport narrows — the same
          trade the builds list makes. */}
      <div className="flex min-w-0 flex-1 items-center">
        <PullRequestButton
          pullRequest={edge.pullRequest}
          className="max-w-full"
          target="_blank"
        />
      </div>
      <div className="hidden w-100 shrink-0 items-center gap-2 md:flex">
        <BuildChips builds={edge.builds} params={params} />
      </div>
      <div className="hidden w-66 shrink-0 items-center gap-1.5 xl:flex">
        <MediaThumbnails medias={edge.medias} />
      </div>
      <div
        className="text-low w-24 shrink-0 truncate text-right text-xs whitespace-nowrap"
        data-visual-test="transparent"
      >
        {edge.pullRequest.date ? <Time date={edge.pullRequest.date} /> : null}
      </div>
    </ListRow>
  );
}

function PullRequestsList(props: {
  pullRequests: PullRequests;
  params: ProjectParams;
  isFetchingMore: boolean;
  fetchNextPage: () => void;
}) {
  const { pullRequests, params, isFetchingMore, fetchNextPage } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = pullRequests.pageInfo;
  const displayCount = pullRequests.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 81,
    getScrollElement: () => parentRef.current,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      !isFetchingMore &&
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, isFetchingMore, hasNextPage, fetchNextPage]);

  return (
    <List
      ref={parentRef}
      className="absolute max-h-full w-full"
      style={{ display: "block" }}
    >
      <div
        className="relative"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {virtualItems.map((virtualRow) => {
          const edge = pullRequests.edges[virtualRow.index];
          const rowStyle = {
            position: "absolute" as const,
            top: 0,
            left: 0,
            width: "100%",
            height: virtualRow.size,
            transform: `translateY(${virtualRow.start}px)`,
          };

          if (!edge) {
            return (
              <ListRowLoader
                key={`loader-${virtualRow.index}`}
                style={rowStyle}
              >
                Fetching pull requests...
              </ListRowLoader>
            );
          }
          return (
            <PullRequestRow
              key={edge.id}
              edge={edge}
              params={params}
              style={rowStyle}
            />
          );
        })}
      </div>
    </List>
  );
}

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const { fetchMore, data } = useSuspenseQuery(ProjectPullRequestsQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: 20,
    },
  });

  const pullRequests = data.project?.pullRequests;

  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(pullRequests);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: {
          after: pullRequests.edges.length,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (
            !prev.project?.pullRequests?.edges ||
            !fetchMoreResult?.project?.pullRequests
          ) {
            return fetchMoreResult;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              pullRequests: {
                ...prev.project.pullRequests,
                ...fetchMoreResult.project.pullRequests,
                edges: [
                  ...prev.project.pullRequests.edges,
                  ...fetchMoreResult.project.pullRequests.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  if (!data.project || !pullRequests) {
    return <NotFound />;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Pull requests</Heading>
          <Text slot="headline">
            View all the pull requests associated with this project, with their
            builds and media.
          </Text>
        </PageHeaderContent>
      </PageHeader>
      {pullRequests.pageInfo.isEmpty ? (
        <EmptyState>
          <EmptyStateIcon>
            <GitPullRequestIcon />
          </EmptyStateIcon>
          <Heading>No pull requests</Heading>
          <Text slot="description">
            A pull request shows up here once a build or a media upload is
            associated with it.
          </Text>
        </EmptyState>
      ) : (
        <div className="relative flex-1">
          <PullRequestsList
            pullRequests={pullRequests}
            params={params}
            fetchNextPage={fetchNextPage}
            isFetchingMore={isFetchingMore}
          />
        </div>
      )}
    </PageContainer>
  );
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  return (
    <Page>
      <ProjectTitle params={params}>Pull requests</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}
