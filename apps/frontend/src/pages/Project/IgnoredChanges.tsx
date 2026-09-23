import { useDeferredValue, useEffect, useRef, useTransition } from "react";
import {
  useApolloClient,
  useMutation,
  useSuspenseQuery,
} from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { useVirtualizer } from "@tanstack/react-virtual";
import clsx from "clsx";
import {
  BookOpenIcon,
  FlagOffIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  WavesIcon,
  ZapIcon,
} from "lucide-react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";

import { AccountAvatar } from "@/containers/AccountAvatar";
import {
  constraintSize,
  DiffCard,
  SingleImage,
} from "@/containers/Build/BuildDiffListPrimitives";
import { IgnoredChangesIllustration } from "@/containers/EmptyStateIllustrations";
import { graphql, type DocumentType } from "@/gql";
import {
  IgnoredChangesOrderBy,
  ProjectPermission,
  UserType,
} from "@/gql/graphql";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import {
  Dialog,
  DialogActionButton,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogValueState,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Heading } from "@/ui/Heading";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
  PageHeaderHeadline,
} from "@/ui/Layout";
import { HeadlessLink, Link } from "@/ui/Link";
import {
  List,
  ListHeaderRow,
  ListRow,
  ListRowLoader,
  ListSortHeader,
} from "@/ui/List";
import { Modal } from "@/ui/Modal";
import type { SortDirection } from "@/ui/SortHeader";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { getUserCardData, UserHoverCard } from "@/ui/UserCard";
import { compactNumberFormatter } from "@/util/intl";

import { NotFound } from "../NotFound";
import { getTestURL } from "../Test/TestParams";
import { useProjectOutletContext } from "./ProjectOutletContext";
import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "./ProjectParams";
import { ProjectTitle } from "./ProjectTitle";

const DOCS_URL =
  "https://argos-ci.com/docs/learn/reliability-and-flakiness/ignored-changes";

/** The page that documents the per-project ignore configuration. */
const FLAKY_DETECTION_DOCS_URL =
  "https://argos-ci.com/docs/learn/reliability-and-flakiness/flaky-test-detection";

const ProjectIgnoredChangesQuery = graphql(`
  query ProjectIgnoredChanges_project(
    $accountSlug: String!
    $projectName: String!
    $after: Int!
    $first: Int!
    $orderBy: IgnoredChangesOrderBy!
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ignoreConfig {
        enabled
      }
      ignoredChanges(after: $after, first: $first, orderBy: $orderBy) {
        pageInfo {
          totalCount
          hasNextPage
        }
        edges {
          id
          ...IgnoredChangeRow_TestChange
        }
      }
    }
  }
`);

const _IgnoredChangeFragment = graphql(`
  fragment IgnoredChangeRow_TestChange on TestChange {
    id
    ignoredAt
    occurrencesSinceIgnored
    ignoredBy {
      id
      name
      slug
      type
      avatar {
        ...AccountAvatarFragment
      }
      ...UserCard_user
    }
    test {
      id
      name
      buildName
    }
    lastSeenDiff {
      id
      createdAt
      url
      width
      height
      contentType
    }
  }
`);

type ProjectIgnoredChangesDocument = DocumentType<
  typeof ProjectIgnoredChangesQuery
>;
type IgnoredChanges = NonNullable<
  ProjectIgnoredChangesDocument["project"]
>["ignoredChanges"];
type IgnoredChange = DocumentType<typeof _IgnoredChangeFragment>;

const PAGE_SIZE = 30;

const SORT_KEYS = ["ignored", "occurrences", "last-seen"] as const;
type SortKey = (typeof SORT_KEYS)[number];

const sortSchema = {
  sort: parseAsStringLiteral(SORT_KEYS).withDefault("ignored"),
  order: parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc"),
};

type Sort = { sort: SortKey; order: SortDirection };

/**
 * The server's ordering for each column and direction. The list is paginated
 * there, so sorting here would only reorder the pages already loaded.
 */
const ORDER_BY: Record<
  SortKey,
  Record<SortDirection, IgnoredChangesOrderBy>
> = {
  ignored: {
    asc: IgnoredChangesOrderBy.IgnoredAtAsc,
    desc: IgnoredChangesOrderBy.IgnoredAtDesc,
  },
  occurrences: {
    asc: IgnoredChangesOrderBy.OccurrencesAsc,
    desc: IgnoredChangesOrderBy.OccurrencesDesc,
  },
  "last-seen": {
    asc: IgnoredChangesOrderBy.LastSeenAsc,
    desc: IgnoredChangesOrderBy.LastSeenDesc,
  },
};

const UnignoreChangeMutation = graphql(`
  mutation ProjectIgnoredChanges_unignoreChange(
    $accountSlug: String!
    $changeId: ID!
  ) {
    unignoreChange(input: { accountSlug: $accountSlug, changeId: $changeId }) {
      id
      ignored
    }
  }
`);

const IgnoreChangeMutation = graphql(`
  mutation ProjectIgnoredChanges_ignoreChange(
    $accountSlug: String!
    $changeId: ID!
  ) {
    ignoreChange(input: { accountSlug: $accountSlug, changeId: $changeId }) {
      id
      ignored
    }
  }
`);

/**
 * Drop a change from the project's ignore ledger in the cache, so the list
 * reacts without refetching and losing the pages already loaded. Whatever the
 * sort order, the other rows keep their place.
 */
function removeFromIgnoredChangesCache(options: {
  cache: ReturnType<typeof useApolloClient>["cache"];
  projectId: string;
  changeId: string;
}) {
  const { cache, projectId, changeId } = options;
  const cacheId = cache.identify({ __typename: "Project", id: projectId });
  if (!cacheId) {
    return;
  }
  cache.modify({
    id: cacheId,
    fields: {
      ignoredChanges(existing, { readField }) {
        if (!existing) {
          return existing;
        }
        const totalCount = Math.max(existing.pageInfo.totalCount - 1, 0);
        return {
          ...existing,
          edges: existing.edges.filter(
            (edge: Parameters<typeof readField>[1]) =>
              readField("id", edge) !== changeId,
          ),
          pageInfo: {
            ...existing.pageInfo,
            totalCount,
            isEmpty: totalCount === 0,
          },
        };
      },
    },
  });
}

/**
 * Drop the cached list of every order but the one on screen, so each is read
 * again when it comes back rather than shown without a change restored since.
 * The list on screen is left alone: evicting it would suspend the page.
 */
function evictOtherOrders(options: {
  cache: ReturnType<typeof useApolloClient>["cache"];
  projectId: string;
  orderBy: IgnoredChangesOrderBy;
}) {
  const { cache, projectId, orderBy } = options;
  const cacheId = cache.identify({ __typename: "Project", id: projectId });
  if (!cacheId) {
    return;
  }
  for (const other of Object.values(IgnoredChangesOrderBy)) {
    if (other !== orderBy) {
      cache.evict({
        id: cacheId,
        fieldName: "ignoredChanges",
        args: { after: 0, first: PAGE_SIZE, orderBy: other },
      });
    }
  }
}

export function Component() {
  const params = useProjectParams();
  invariant(params, "it is a project route");

  return (
    <Page>
      <ProjectTitle params={params}>Ignored</ProjectTitle>
      <PageContent params={params} />
    </Page>
  );
}

/** The change a confirmation dialog is currently asking about. */
type UnignoreValue = { changeId: string; testName: string };

function PageContent(props: { params: ProjectParams }) {
  const { params } = props;
  const [sort, setSort] = useQueryStates(sortSchema);
  const deferredSort = useDeferredValue(sort);
  const isUpdating = sort !== deferredSort;
  const orderBy = ORDER_BY[deferredSort.sort][deferredSort.order];
  const { fetchMore, data } = useSuspenseQuery(ProjectIgnoredChangesQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: PAGE_SIZE,
      orderBy,
    },
  });
  const client = useApolloClient();
  const project = data.project;
  const ignoredChanges = project?.ignoredChanges;
  // Held as state rather than rendered per row: removing the row on success
  // would unmount the dialog mid-animation.
  const unignoring = useDialogValueState<UnignoreValue | null>(null);
  const [isFetchingMore, startFetchMoreTransition] = useTransition();
  const fetchNextPage = useEventCallback(() => {
    invariant(ignoredChanges);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: { after: ignoredChanges.edges.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (
            !prev.project?.ignoredChanges.edges ||
            !fetchMoreResult?.project?.ignoredChanges
          ) {
            return fetchMoreResult;
          }

          return {
            ...prev,
            project: {
              ...prev.project,
              ignoredChanges: {
                ...prev.project.ignoredChanges,
                ...fetchMoreResult.project.ignoredChanges,
                edges: [
                  ...prev.project.ignoredChanges.edges,
                  ...fetchMoreResult.project.ignoredChanges.edges,
                ],
              },
            },
          };
        },
      });
    });
  });

  // Where a change lands when it is ignored again depends on the sort order,
  // and on what it now reads — ignoring it anew restarts its count — so the
  // rows on screen are read back rather than patched. One more than on screen,
  // so the change coming back does not push the last row out.
  const refreshLoadedChanges = useEventCallback(() => {
    invariant(ignoredChanges);
    startFetchMoreTransition(() => {
      fetchMore({
        variables: { after: 0, first: ignoredChanges.edges.length + 1 },
        updateQuery: (_prev, { fetchMoreResult }) => fetchMoreResult,
      });
    });
  });

  const projectId = project?.id;

  // Runs from a toast, which outlives this component's dialog, so it goes
  // through the client rather than a `useMutation` bound to a mounted tree.
  const undoUnignore = useEventCallback((changeId: string) => {
    invariant(projectId);
    client
      .mutate({
        mutation: IgnoreChangeMutation,
        variables: { accountSlug: params.accountSlug, changeId },
        update: (cache) => evictOtherOrders({ cache, projectId, orderBy }),
      })
      .then(
        () => {
          refreshLoadedChanges();
          toast.success("Change ignored again", {
            id: `ignore-change:${changeId}`,
          });
        },
        () =>
          toast.error("Could not restore the ignored change", {
            id: `ignore-change:${changeId}`,
          }),
      );
  });

  const onSort = (key: SortKey) => {
    setSort(
      key === sort.sort
        ? { order: sort.order === "asc" ? "desc" : "asc" }
        : // The latest date or the biggest count first: the end worth reading.
          { sort: key, order: "desc" },
    );
  };

  if (!project || !ignoredChanges) {
    return <NotFound />;
  }

  if (!project.ignoreConfig.enabled) {
    return (
      <PageContainer>
        <FeatureDisabledEmptyState params={params} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {ignoredChanges.pageInfo.totalCount === 0 ? (
        <NothingIgnoredEmptyState params={params} />
      ) : (
        <>
          <PageHeader>
            <PageHeaderContent>
              <Heading>Ignored changes</Heading>
              <PageHeaderHeadline>
                Changes Argos no longer asks you to review. Unignore one to
                start tracking it again.
              </PageHeaderHeadline>
            </PageHeaderContent>
          </PageHeader>
          <div className="relative flex-1">
            <IgnoredChangesList
              ignoredChanges={ignoredChanges}
              params={params}
              sort={sort}
              onSort={onSort}
              isUpdating={isUpdating}
              isFetchingMore={isFetchingMore}
              fetchNextPage={fetchNextPage}
              onUnignore={(value) => unignoring.open(value)}
            />
          </div>
        </>
      )}
      {unignoring.value ? (
        <Modal open={unignoring.isOpen} onOpenChange={unignoring.onOpenChange}>
          <UnignoreChangeDialog
            projectId={project.id}
            params={params}
            changeId={unignoring.value.changeId}
            testName={unignoring.value.testName}
            onUndo={undoUnignore}
          />
        </Modal>
      ) : null}
    </PageContainer>
  );
}

/**
 * Shown when the ignore feature is off. The tab is hidden in that case, so this
 * is only reached through a direct link or a bookmark — it explains the state
 * rather than pretending the list is simply empty.
 */
function FeatureDisabledEmptyState(props: { params: ProjectParams }) {
  const { permissions } = useProjectOutletContext();
  const canViewSettings = permissions.includes(ProjectPermission.ViewSettings);
  return (
    <EmptyState>
      <EmptyStateIcon>
        <SlidersHorizontalIcon strokeWidth={1} />
      </EmptyStateIcon>
      <Heading>Ignoring is turned off</Heading>
      <EmptyStateDescription>
        New builds on this project ignore nothing — every change is treated as
        needing review. Turn the feature on to let reviewers mute recurring
        flaky changes.
      </EmptyStateDescription>
      {canViewSettings && (
        <EmptyStateActions>
          <LinkButton
            href={`${getProjectURL(props.params)}/settings/flaky-detection`}
          >
            Turn on ignoring
          </LinkButton>
        </EmptyStateActions>
      )}
      <EmptyStateLearnMore href={FLAKY_DETECTION_DOCS_URL} />
    </EmptyState>
  );
}

/**
 * The empty state that carries the feature's explanation: most people land here
 * before they have ever ignored anything, so it has to teach the mental model
 * (an exact diff match, not a whole test) and point at where the action lives.
 */
function NothingIgnoredEmptyState(props: { params: ProjectParams }) {
  const { permissions } = useProjectOutletContext();
  const canViewSettings = permissions.includes(ProjectPermission.ViewSettings);
  return (
    <EmptyState>
      <EmptyStateIllustration>
        <IgnoredChangesIllustration />
      </EmptyStateIllustration>
      <Heading>Nothing is ignored yet</Heading>
      <EmptyStateDescription>
        Ignoring a change tells Argos to stop asking you to review it. Reach for
        it when a diff is flaky — the kind that keeps coming back build after
        build without anything really changing.
      </EmptyStateDescription>
      {canViewSettings && (
        <EmptyStateActions>
          <LinkButton
            variant="secondary"
            href={`${getProjectURL(props.params)}/settings/flaky-detection`}
          >
            <ButtonIcon>
              <SettingsIcon />
            </ButtonIcon>
            Configure auto-ignore
          </LinkButton>
        </EmptyStateActions>
      )}
      <EmptyStateLearnMore href={DOCS_URL} />
      <EmptyStateSteps>
        <EmptyStateStep
          icon={<FlagOffIcon />}
          step="While reviewing"
          title="Flag the change"
        >
          Use the flag button in the build review toolbar, on the diff you don’t
          want to see again.
        </EmptyStateStep>
        <EmptyStateStep
          icon={<WavesIcon />}
          step="On later builds"
          title="Argos matches it exactly"
        >
          Only diffs whose fingerprint is identical are skipped. A real change
          to the same test still shows up.
        </EmptyStateStep>
        <EmptyStateStep
          icon={<BookOpenIcon />}
          step="Back here"
          title="Keep the list honest"
        >
          Every ignored change lands on this page with how often it still fires,
          so you can unignore the ones that went quiet.
        </EmptyStateStep>
      </EmptyStateSteps>
    </EmptyState>
  );
}

const DIFF_IMAGE_CONFIG = {
  maxWidth: 112,
  maxHeight: 56,
  defaultHeight: 56,
};

function IgnoredChangesList(props: {
  ignoredChanges: IgnoredChanges;
  params: ProjectParams;
  sort: Sort;
  onSort: (key: SortKey) => void;
  isUpdating: boolean;
  isFetchingMore: boolean;
  fetchNextPage: () => void;
  onUnignore: (value: UnignoreValue) => void;
}) {
  const {
    ignoredChanges,
    params,
    sort,
    onSort,
    isUpdating,
    isFetchingMore,
    fetchNextPage,
    onUnignore,
  } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const { hasNextPage } = ignoredChanges.pageInfo;
  const displayCount = ignoredChanges.edges.length;
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? displayCount + 1 : displayCount,
    estimateSize: () => 75,
    getScrollElement: () => parentRef.current,
    overscan: 20,
    getItemKey: (index) => ignoredChanges.edges[index]?.id ?? "loader",
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const lastItem = virtualItems[virtualItems.length - 1];
  useEffect(() => {
    if (
      lastItem &&
      lastItem.index === displayCount &&
      !isFetchingMore &&
      hasNextPage &&
      // Mid-sort, the rows on screen still belong to the previous order, so
      // their count is the wrong offset for the next page of the new one.
      !isUpdating
    ) {
      fetchNextPage();
    }
  }, [
    lastItem,
    displayCount,
    isFetchingMore,
    hasNextPage,
    isUpdating,
    fetchNextPage,
  ]);

  const getSortProps = (key: SortKey) => ({
    direction: sort.sort === key ? sort.order : null,
    onSort: () => {
      parentRef.current?.scrollTo({ top: 0 });
      onSort(key);
    },
  });

  return (
    <List
      aria-busy={isUpdating}
      className={clsx(
        "absolute max-h-full w-full overflow-hidden",
        isUpdating && "animate-pulse",
      )}
    >
      <ListHeaderRow role="row">
        <div role="columnheader" className="flex-1 truncate">
          Change
        </div>
        <ListSortHeader {...getSortProps("ignored")} className="w-44">
          Ignored
        </ListSortHeader>
        <ListSortHeader
          {...getSortProps("occurrences")}
          align="end"
          tooltip={
            <>
              Number of auto-approved builds that have shown this exact change
              since it was ignored — the review noise it has absorbed.
            </>
          }
          className="w-24"
        >
          Occurrences
        </ListSortHeader>
        <ListSortHeader
          {...getSortProps("last-seen")}
          align="end"
          tooltip={
            <>
              Last build in which this exact change appeared. A change that went
              quiet is a good candidate to unignore.
            </>
          }
          className="w-28"
        >
          Last seen
        </ListSortHeader>
        <div role="columnheader" className="w-24">
          <span className="sr-only">Actions</span>
        </div>
      </ListHeaderRow>
      <div ref={parentRef} className="overflow-auto">
        <div
          className="relative"
          style={{ height: rowVirtualizer.getTotalSize() }}
        >
          {virtualItems.map((virtualRow) => {
            const ignoredChange = ignoredChanges.edges[virtualRow.index];
            const style = {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            } as const;

            if (!ignoredChange) {
              return (
                <ListRowLoader key={virtualRow.key} style={style}>
                  Fetching ignored changes...
                </ListRowLoader>
              );
            }

            return (
              <IgnoredChangeRow
                key={virtualRow.key}
                ignoredChange={ignoredChange}
                params={params}
                style={style}
                onUnignore={onUnignore}
              />
            );
          })}
        </div>
      </div>
    </List>
  );
}

function IgnoredChangeRow(props: {
  ignoredChange: IgnoredChange;
  params: ProjectParams;
  style: React.CSSProperties;
  onUnignore: (value: UnignoreValue) => void;
}) {
  const { ignoredChange, params, style, onUnignore } = props;
  const { permissions } = useProjectOutletContext();
  const { test, lastSeenDiff, ignoredBy } = ignoredChange;
  const testURL = getTestURL(
    { ...params, testId: test.id },
    { change: ignoredChange.id },
  );
  const thumbnailURL = lastSeenDiff?.url ?? null;

  return (
    <ListRow
      // `ListRowLink` can't be used here — the row holds a button as well as a
      // link — so the hover and focus feedback it provides is rebuilt by hand,
      // and the link is stretched over the row so the whole row is clickable
      // rather than just its first cell.
      className="group/row hover:bg-hover has-[a:focus-visible]:bg-hover relative flex items-center gap-6 p-4 text-sm"
      style={style}
    >
      <HeadlessLink
        href={testURL}
        className="flex min-w-0 flex-1 gap-4 truncate after:absolute after:inset-0 focus:outline-hidden"
      >
        {lastSeenDiff && thumbnailURL ? (
          <DiffCard
            isActive={false}
            variant="neutral"
            className="w-28 shrink-0"
          >
            <SingleImage
              contentType={lastSeenDiff.contentType}
              dimensions={
                lastSeenDiff.width != null && lastSeenDiff.height != null
                  ? constraintSize(
                      {
                        width: lastSeenDiff.width,
                        height: lastSeenDiff.height,
                      },
                      DIFF_IMAGE_CONFIG,
                    )
                  : {
                      height: DIFF_IMAGE_CONFIG.defaultHeight,
                      width: DIFF_IMAGE_CONFIG.maxWidth,
                    }
              }
              url={thumbnailURL}
            />
          </DiffCard>
        ) : null}
        <div className="flex flex-col justify-center truncate">
          <Truncable className="font-medium">{test.name}</Truncable>
          {test.buildName !== "default" ? (
            <Truncable className="text-low">{test.buildName}</Truncable>
          ) : null}
        </div>
      </HeadlessLink>
      {/* Positioned, so it stacks above the stretched link and its hover card
          stays reachable. */}
      <div className="text-low relative w-44 text-xs">
        {ignoredChange.ignoredAt ? (
          <Time date={ignoredChange.ignoredAt} />
        ) : (
          <span>Unknown date</span>
        )}
        {ignoredBy ? (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <UserHoverCard user={getUserCardData(ignoredBy)}>
              <span
                tabIndex={0}
                className="flex min-w-0 items-center gap-1.5 truncate"
              >
                <AccountAvatar
                  avatar={ignoredBy.avatar}
                  className="size-3.5 shrink-0 border"
                />
                <span className="truncate">
                  {ignoredBy.name || ignoredBy.slug}
                </span>
              </span>
            </UserHoverCard>
            {/* The bot as author already hints at it; the badge is what makes it
                scannable, and carries the setting that governs it. */}
            {ignoredBy.type === UserType.Bot && (
              <AutoIgnoreBadge params={params} />
            )}
          </div>
        ) : null}
      </div>
      <div
        className={clsx(
          "w-24 text-right tabular-nums",
          ignoredChange.occurrencesSinceIgnored === 0 && "text-low",
        )}
      >
        {compactNumberFormatter.format(ignoredChange.occurrencesSinceIgnored)}
      </div>
      {/* Positioned like the cell above: `Time` carries a tooltip with the full
          timestamp, which the stretched link would otherwise cover. */}
      <div className="text-low relative w-28 text-right text-xs">
        {lastSeenDiff ? (
          <Time date={lastSeenDiff.createdAt} />
        ) : (
          <span>Never</span>
        )}
      </div>
      {/* The cell keeps its width so revealing the action doesn't shift the
          row. `opacity-0` rather than `invisible` so the button stays in the tab
          order, and `focus-within` brings it back for keyboard users. */}
      <div className="relative flex w-24 justify-end">
        {permissions.includes(ProjectPermission.Review) && (
          <Button
            variant="secondary"
            size="small"
            className="opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100"
            onClick={() =>
              onUnignore({
                changeId: ignoredChange.id,
                testName: test.name,
              })
            }
          >
            Unignore
          </Button>
        )}
      </div>
    </ListRow>
  );
}

/**
 * Marks a change that auto-ignore muted on its own, and offers the setting that
 * governs it — the only actionable thing about an ignore nobody performed.
 */
function AutoIgnoreBadge(props: { params: ProjectParams }) {
  const { permissions } = useProjectOutletContext();
  return (
    <Tooltip
      variant="info"
      // The tooltip holds a link, so its content has to stay hoverable.
      disableHoverableContent={false}
      content={
        <TooltipContainer>
          <TooltipHeader icon={ZapIcon}>Ignored automatically</TooltipHeader>
          <p>
            Nobody flagged this one. Argos ignored it because the same change
            came back often enough in auto-approved builds to count as flaky.
          </p>
          {permissions.includes(ProjectPermission.ViewSettings) && (
            <Link
              href={`${getProjectURL(props.params)}/settings/flaky-detection`}
              className="underline-link"
            >
              Configure auto-ignore
            </Link>
          )}
        </TooltipContainer>
      }
    >
      <Chip color="neutral" scale="xs" icon={ZapIcon}>
        Auto
      </Chip>
    </Tooltip>
  );
}

function UnignoreChangeDialog(props: {
  projectId: string;
  params: ProjectParams;
  changeId: string;
  testName: string;
  onUndo: (changeId: string) => void;
}) {
  const { projectId, params, changeId, testName, onUndo } = props;
  const state = useOverlayTriggerState();
  const [unignore, { error }] = useMutation(UnignoreChangeMutation, {
    variables: { accountSlug: params.accountSlug, changeId },
    update: (cache) =>
      removeFromIgnoredChangesCache({ cache, projectId, changeId }),
  });

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Unignore change</DialogTitle>
        <DialogText>
          Argos will treat this change as a change again, so{" "}
          <strong>{testName}</strong> will need review the next time it appears.
          Only unignore if the flake is resolved.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error && (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        )}
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            try {
              await unignore();
              state.close();
              toast.success("Change unignored", {
                // Keyed on the change so unignore → undo → unignore reuses the
                // same toast instead of stacking duplicates.
                id: `unignore-change:${changeId}`,
                action: {
                  label: "Undo",
                  onClick: () => onUndo(changeId),
                },
              });
            } catch {
              // Surfaced via the mutation's `error` state above.
            }
          }}
        >
          Unignore change
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
