import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ImagePlayIcon } from "lucide-react";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { MediaPullRequestRow } from "@/containers/Media/MediaPullRequestRow";
import { graphql } from "@/gql";
import {
  EmptyState,
  EmptyStateIcon,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { List, ListLoadMore } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";

const PAGE_SIZE = 20;

const AccountPullRequestsQuery = graphql(`
  query AccountPullRequests_mediaPullRequests(
    $accountSlug: String!
    $after: Int!
    $first: Int!
  ) {
    account(slug: $accountSlug) {
      id
      mediaPullRequests(after: $after, first: $first) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          ...MediaPullRequestRow_MediaPullRequest
        }
      }
    }
  }
`);

/** @route */
export function Component() {
  const { accountSlug } = useParams();
  invariant(accountSlug);

  return (
    <Page>
      <Helmet>
        <title>{accountSlug} • Pull requests</title>
      </Helmet>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Pull requests</Heading>
          <Text slot="headline">
            Pull requests with screenshots and recordings uploaded to them,
            newest first. Upload them from the{" "}
            <Link
              href="/docs/learn/media/standalone-media-upload"
              target="_blank"
            >
              CLI, the API or an agent
            </Link>
            .
          </Text>
        </PageHeaderContent>
      </PageHeader>
      <PageContainer>
        <Suspense fallback={<PageLoader />}>
          <PullRequestList accountSlug={accountSlug} />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function PullRequestList(props: { accountSlug: string }) {
  const { accountSlug } = props;
  const { data, fetchMore } = useSuspenseQuery(AccountPullRequestsQuery, {
    variables: { accountSlug, after: 0, first: PAGE_SIZE },
  });

  const connection = data.account?.mediaPullRequests;
  invariant(connection, "the account is resolved by the route");

  if (connection.pageInfo.totalCount === 0) {
    return (
      <EmptyState>
        <EmptyStateIcon>
          <ImagePlayIcon />
        </EmptyStateIcon>
        <Heading>No media yet</Heading>
        <Text slot="description">
          Run <code>argos media upload before.png after.png --pr 1234</code> in
          CI or from an agent, and the pull request will show up here with its
          screenshots.
        </Text>
      </EmptyState>
    );
  }

  return (
    <>
      <List>
        {connection.edges.map((edge) => (
          <MediaPullRequestRow key={edge.id} mediaPullRequest={edge} />
        ))}
      </List>
      {connection.pageInfo.hasNextPage ? (
        <ListLoadMore
          onPress={() => {
            fetchMore({
              variables: { after: connection.edges.length, first: PAGE_SIZE },
            });
          }}
        />
      ) : null}
    </>
  );
}
