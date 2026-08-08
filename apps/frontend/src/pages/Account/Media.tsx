import { Suspense, useDeferredValue, useTransition } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { ImagePlayIcon, SearchIcon } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { Heading, Text } from "react-aria-components";
import { Helmet } from "react-helmet";

import { MediaRow } from "@/containers/Media/MediaRow";
import { MediaUploadButton } from "@/containers/Media/MediaUploadDialog";
import { graphql } from "@/gql";
import { MediaType } from "@/gql/graphql";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  EmptyStateLearnMore,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
} from "@/ui/Layout";
import { List, ListLoadMore, ListRowLoader } from "@/ui/List";
import { PageLoader } from "@/ui/PageLoader";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";

import { NotFound } from "../NotFound";
import { useAccountParams } from "./AccountParams";

const PAGE_SIZE = 30;

const DOCS_URL =
  "https://argos-ci.com/docs/learn/media/standalone-media-upload";

const AccountMediaQuery = graphql(`
  query AccountMedia_account_media(
    $accountSlug: String!
    $after: Int!
    $first: Int!
    $filters: MediaFilterInput
  ) {
    account(slug: $accountSlug) {
      id
      slug
      media(after: $after, first: $first, filters: $filters) {
        pageInfo {
          totalCount
          hasNextPage
          isEmpty
        }
        edges {
          id
          ...MediaRow_Media
        }
      }
    }
  }
`);

export function Component() {
  const params = useAccountParams();

  if (!params) {
    return <NotFound />;
  }

  return (
    <Page>
      <Helmet>
        <title>{params.accountSlug} • Media</title>
      </Helmet>
      <PageContainer>
        <PageHeader>
          <PageHeaderContent>
            <Heading>Media</Heading>
            <Text slot="headline">
              Images and videos uploaded to this team, shareable by link.
            </Text>
          </PageHeaderContent>
          <PageHeaderActions>
            <MediaUploadButton accountSlug={params.accountSlug} />
          </PageHeaderActions>
        </PageHeader>
        <Suspense fallback={<PageLoader />}>
          <MediaLibrary accountSlug={params.accountSlug} />
        </Suspense>
      </PageContainer>
    </Page>
  );
}

function MediaLibrary(props: { accountSlug: string }) {
  const [filters, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    type: parseAsString.withDefault(""),
  });
  const [isPending, startTransition] = useTransition();

  // The list re-renders on a stale value while the new one loads, so typing
  // never blocks on a round trip.
  const search = useDeferredValue(filters.search);
  const type = parseMediaType(filters.type);

  const { data, fetchMore } = useSuspenseQuery(AccountMediaQuery, {
    variables: {
      accountSlug: props.accountSlug,
      after: 0,
      first: PAGE_SIZE,
      filters: { search: search || null, type },
    },
  });

  if (!data.account) {
    return <NotFound />;
  }

  const { media } = data.account;
  const hasFilters = search !== "" || type !== null;

  // An empty library and an empty search result are different situations: one
  // needs teaching, the other needs a way back.
  if (media.pageInfo.isEmpty && !hasFilters) {
    return <MediaEmptyState accountSlug={props.accountSlug} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <TextInputGroup className="max-w-xs">
        <TextInputIcon>
          <SearchIcon />
        </TextInputIcon>
        <TextInput
          aria-label="Search media"
          placeholder="Search by name"
          value={filters.search}
          onChange={(event) => {
            const { value } = event.target;
            startTransition(() => {
              void setFilters({ search: value || null });
            });
          }}
        />
      </TextInputGroup>

      <List className={isPending ? "opacity-disabled" : undefined}>
        {media.edges.length === 0 ? (
          <ListRowLoader delay={0}>No media matches your search.</ListRowLoader>
        ) : (
          media.edges.map((item) => <MediaRow key={item.id} media={item} />)
        )}
      </List>

      {media.pageInfo.hasNextPage && (
        <ListLoadMore
          onPress={() =>
            void fetchMore({
              variables: { after: media.edges.length, first: PAGE_SIZE },
            })
          }
        />
      )}
    </div>
  );
}

function MediaEmptyState(props: { accountSlug: string }) {
  return (
    <EmptyState>
      <EmptyStateIcon>
        <ImagePlayIcon />
      </EmptyStateIcon>
      <Heading>No media yet</Heading>
      <Text slot="description">
        Upload a screenshot or a screen recording to get a link you can paste
        into a pull request. Agents can upload from the command line with{" "}
        <code className="font-mono">argos media upload</code>.
      </Text>
      <EmptyStateActions>
        <MediaUploadButton accountSlug={props.accountSlug} />
      </EmptyStateActions>
      <EmptyStateLearnMore href={DOCS_URL} />
    </EmptyState>
  );
}

/** Narrow the free-form query parameter to the filter the schema accepts. */
function parseMediaType(value: string): MediaType | null {
  switch (value) {
    case "image":
      return MediaType.Image;
    case "video":
      return MediaType.Video;
    default:
      return null;
  }
}
