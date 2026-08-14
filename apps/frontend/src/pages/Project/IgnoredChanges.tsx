import { useEffect, useRef, useTransition } from "react";
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
import { useNumberFormatter } from "react-aria";
import { Heading, Text } from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import {
  constraintSize,
  DiffCard,
  SingleImage,
} from "@/containers/Build/BuildDiffListPrimitives";
import { IgnoredChangesIllustration } from "@/containers/EmptyStateIllustrations";
import { graphql, type DocumentType } from "@/gql";
import { ProjectPermission, UserType } from "@/gql/graphql";
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
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateIcon,
  EmptyStateIllustration,
  EmptyStateLearnMore,
  EmptyStateStep,
  EmptyStateSteps,
  Page,
  PageContainer,
  PageHeader,
  PageHeaderContent,
} from "@/ui/Layout";
import { HeadlessLink, Link } from "@/ui/Link";
import { List, ListHeaderRow, ListRow, ListRowLoader } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { Tooltip, TooltipContainer, TooltipHeader } from "@/ui/Tooltip";
import { Truncable } from "@/ui/Truncable";
import { useEventCallback } from "@/ui/useEventCallback";
import { getUserCardData, UserHoverCard } from "@/ui/UserCard";

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
  ) {
    project(accountSlug: $accountSlug, projectName: $projectName) {
      id
      ignoreConfig {
        enabled
      }
      ignoredChanges(after: $after, first: $first) {
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

/**
 * Both mutations select the fields the ledger row renders, so that undoing an
 * unignore refreshes the restored row through normalization instead of leaving
 * it showing the previous ignore's date and count.
 */
const UnignoreChangeMutation = graphql(`
  mutation ProjectIgnoredChanges_unignoreChange(
    $accountSlug: String!
    $changeId: ID!
  ) {
    unignoreChange(input: { accountSlug: $accountSlug, changeId: $changeId }) {
      id
      ignored
      ignoredAt
      occurrencesSinceIgnored
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
      ignoredAt
      occurrencesSinceIgnored
    }
  }
`);

/**
 * Add or drop a change from the project's ignore ledger in the cache, so the
 * list reacts without refetching and losing the pages already loaded.
 */
function updateIgnoredChangesCache(options: {
  cache: ReturnType<typeof useApolloClient>["cache"];
  projectId: string;
  changeId: string;
  operation: "remove" | "restore";
}) {
  const { cache, projectId, changeId, operation } = options;
  const cacheId = cache.identify({ __typename: "Project", id: projectId });
  if (!cacheId) {
    return;
  }
  cache.modify({
    id: cacheId,
    fields: {
      ignoredChanges(existing, { readField, toReference }) {
        if (!existing) {
          return existing;
        }
        const edges = existing.edges.filter(
          (edge: Parameters<typeof readField>[1]) =>
            readField("id", edge) !== changeId,
        );
        if (operation === "restore") {
          const ref = toReference({ __typename: "TestChange", id: changeId });
          if (!ref) {
            return existing;
          }
          // Re-ignoring makes it the most recently ignored change, which is the
          // top of this list.
          edges.unshift(ref);
        }
        const totalCount =
          operation === "restore"
            ? existing.pageInfo.totalCount + 1
            : Math.max(existing.pageInfo.totalCount - 1, 0);
        return {
          ...existing,
          edges,
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
  const { fetchMore, data } = useSuspenseQuery(ProjectIgnoredChangesQuery, {
    variables: {
      accountSlug: params.accountSlug,
      projectName: params.projectName,
      after: 0,
      first: 30,
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

  const projectId = project?.id;

  // Runs from a toast, which outlives this component's dialog, so it goes
  // through the client rather than a `useMutation` bound to a mounted tree.
  const undoUnignore = useEventCallback((changeId: string) => {
    invariant(projectId);
    client
      .mutate({
        mutation: IgnoreChangeMutation,
        variables: { accountSlug: params.accountSlug, changeId },
        update: (cache) =>
          updateIgnoredChangesCache({
            cache,
            projectId,
            changeId,
            operation: "restore",
          }),
      })
      .then(
        () =>
          toast.success("Change ignored again", {
            id: `ignore-change:${changeId}`,
          }),
        () =>
          toast.error("Could not restore the ignored change", {
            id: `ignore-change:${changeId}`,
          }),
      );
  });

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
              <Text slot="headline">
                Changes Argos no longer asks you to review, most recently
                ignored first. Unignore one to start tracking it again.
              </Text>
            </PageHeaderContent>
          </PageHeader>
          <div className="relative flex-1">
            <IgnoredChangesList
              ignoredChanges={ignoredChanges}
              params={params}
              isFetchingMore={isFetchingMore}
              fetchNextPage={fetchNextPage}
              onUnignore={(value) => unignoring.open(value)}
            />
          </div>
        </>
      )}
      {unignoring.value ? (
        <Modal
          isOpen={unignoring.isOpen}
          onOpenChange={unignoring.onOpenChange}
        >
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
      <Text slot="description">
        New builds on this project ignore nothing — every change is treated as
        needing review. Turn the feature on to let reviewers mute recurring
        flaky changes.
      </Text>
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
      <Text slot="description">
        Ignoring a change tells Argos to stop asking you to review it. Reach for
        it when a diff is flaky — the kind that keeps coming back build after
        build without anything really changing.
      </Text>
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
  isFetchingMore: boolean;
  fetchNextPage: () => void;
  onUnignore: (value: UnignoreValue) => void;
}) {
  const { ignoredChanges, params, isFetchingMore, fetchNextPage, onUnignore } =
    props;
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
      hasNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, displayCount, isFetchingMore, hasNextPage, fetchNextPage]);

  return (
    <List className="absolute max-h-full w-full overflow-hidden">
      <ListHeaderRow>
        <div className="flex-1 truncate">Change</div>
        <div className="w-44">Ignored</div>
        <div className="w-24 text-right">
          <Tooltip
            content={
              <>
                Number of auto-approved builds that have shown this exact change
                since it was ignored — the review noise it has absorbed.
              </>
            }
          >
            <span className="underline-emphasis">Occurrences</span>
          </Tooltip>
        </div>
        <div className="w-28 text-right">
          <Tooltip
            content={
              <>
                Last build in which this exact change appeared. A change that
                went quiet is a good candidate to unignore.
              </>
            }
          >
            <span className="underline-emphasis">Last seen</span>
          </Tooltip>
        </div>
        <div className="w-24" />
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
  const compactFormatter = useNumberFormatter({ notation: "compact" });
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
        {compactFormatter.format(ignoredChange.occurrencesSinceIgnored)}
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
            onPress={() =>
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
      updateIgnoredChangesCache({
        cache,
        projectId,
        changeId,
        operation: "remove",
      }),
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
