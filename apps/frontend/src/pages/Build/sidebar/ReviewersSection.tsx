import { useMemo, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  BanIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import {
  Autocomplete,
  Input,
  SearchField,
  useFilter,
  type Selection,
} from "react-aria-components";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useAuthTokenPayload } from "@/containers/Auth";
import { useBuildHotkey } from "@/containers/Build/BuildHotkeys";
import { BuildReviewersStatusList } from "@/containers/BuildReviewersStatusList";
import { useProjectPermissions } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType, ProjectPermission } from "@/gql/graphql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { HotkeyTooltip } from "@/ui/HotkeyTooltip";
import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Panel, PanelHeader, PanelTitle } from "@/ui/Panel";
import { Popover } from "@/ui/Popover";
import { getUserCardData } from "@/ui/UserCard";
import {
  getLatestActiveReviewByUser,
  getLatestReviewByUser,
} from "@/util/build-review";
import { getErrorMessage } from "@/util/error";

const _BuildFragment = graphql(`
  fragment ReviewersSection_Build on Build {
    id
    status
    type
    mergeQueue
    reviews {
      id
      date
      state
      dismissedAt
      automatic
      user {
        ...UserCard_user
      }
    }
    members {
      id
      name
      slug
      avatar {
        ...AccountAvatarFragment
      }
    }
    reviewers {
      ...UserCard_user
    }
  }
`);

const DismissReviewMutation = graphql(`
  mutation ReviewersSection_dismissReview(
    $input: DismissReviewInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    dismissReview(input: $input) {
      id
      status
      ...BuildStatusChip_Build
      ...ReviewersSection_Build
      ...ReviewActivitySection_Build
    }
  }
`);

const AddBuildReviewersMutation = graphql(`
  mutation ReviewersSection_addBuildReviewers(
    $input: AddBuildReviewersInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addBuildReviewers(input: $input) {
      id
      ...ReviewersSection_Build
    }
  }
`);

const RemoveBuildReviewersMutation = graphql(`
  mutation ReviewersSection_removeBuildReviewers(
    $input: RemoveBuildReviewersInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    removeBuildReviewers(input: $input) {
      id
      ...ReviewersSection_Build
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Review = Build["reviews"][number];

function getEmptyStateMessage(
  build: Pick<Build, "status" | "type" | "mergeQueue">,
): string {
  if (build.mergeQueue) {
    return "This build was triggered in a merge queue and doesn't require a review.";
  }
  if (build.type === BuildType.Reference) {
    return "This build was auto-approved, no review needed.";
  }
  if (build.type === BuildType.Skipped) {
    return "This build was skipped, no review needed.";
  }
  switch (build.status) {
    case BuildStatus.NoChanges:
      return "No changes detected, no review needed.";
    case BuildStatus.Pending:
    case BuildStatus.Progress:
      return "Build is still in progress.";
    case BuildStatus.Aborted:
    case BuildStatus.Error:
    case BuildStatus.Expired:
      return "This build can't be reviewed.";
    default:
      return "Waiting for review.";
  }
}

export function ReviewersSection(props: { build: Build }) {
  const { build } = props;
  const permissions = useProjectPermissions();
  const projectParams = useProjectParams();
  invariant(projectParams);
  const [reviewToDismiss, setReviewToDismiss] = useState<Review | null>(null);
  const [dismissReview, dismissReviewState] = useMutation(
    DismissReviewMutation,
    {
      onCompleted() {
        setReviewToDismiss(null);
      },
    },
  );
  const canDismissReview = permissions.includes(
    ProjectPermission.ReviewDismiss,
  );
  const canRequestReviewers = permissions.includes(ProjectPermission.Review);

  // Requested reviewers that haven't reviewed yet are shown as pending, after
  // the submitted reviews.
  const reviewedUserIds = new Set(
    getLatestReviewByUser(build.reviews)
      .map((review) => review.user?.id)
      .filter((id): id is string => Boolean(id)),
  );
  const pendingReviewers = build.reviewers.filter(
    (reviewer) => !reviewedUserIds.has(reviewer.id),
  );
  const hasReviewers = reviewedUserIds.size > 0 || pendingReviewers.length > 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Reviewers</PanelTitle>
        {canRequestReviewers ? <RequestReviewersMenu build={build} /> : null}
      </PanelHeader>
      {!hasReviewers ? (
        <div className="text-low px-4 text-xs">
          {getEmptyStateMessage(build)}
        </div>
      ) : (
        <BuildReviewersStatusList
          reviews={build.reviews}
          pendingUsers={pendingReviewers}
          className="gap-3"
          itemClassName={clsx("px-4 has-data-actions-menu:pr-3")}
          getUserCardData={getUserCardData}
          renderAction={
            canDismissReview
              ? (review) => (
                  <ReviewActionsMenu
                    review={review}
                    onDismiss={() => {
                      dismissReviewState.reset();
                      setReviewToDismiss(review);
                    }}
                  />
                )
              : undefined
          }
        />
      )}
      <Modal
        isOpen={Boolean(reviewToDismiss)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setReviewToDismiss(null);
          }
        }}
        isDismissable={!dismissReviewState.loading}
      >
        {reviewToDismiss ? (
          <DismissReviewDialog
            review={reviewToDismiss}
            loading={dismissReviewState.loading}
            error={dismissReviewState.error}
            onDismiss={() => {
              dismissReview({
                variables: {
                  input: {
                    reviewId: reviewToDismiss.id,
                  },
                  accountSlug: projectParams.accountSlug,
                  projectName: projectParams.projectName,
                },
              }).catch(() => {});
            }}
          />
        ) : null}
      </Modal>
    </Panel>
  );
}

/**
 * "+" button in the Reviewers header that opens a searchable, multi-select menu
 * of project members. Checking a member requests their review; unchecking
 * cancels the request.
 */
function RequestReviewersMenu(props: { build: Build }) {
  const { build } = props;
  const projectParams = useProjectParams();
  invariant(projectParams);
  const { contains } = useFilter({ sensitivity: "base" });
  const [isOpen, setIsOpen] = useState(false);
  const hotkey = useBuildHotkey("requestReviewers", () => setIsOpen(true));
  const client = useApolloClient();

  // You can't request yourself as a reviewer, so exclude the current user from
  // the picker (the server enforces this too).
  const authPayload = useAuthTokenPayload();
  const currentAccountId = authPayload?.account.id;
  const members = useMemo(
    () => build.members.filter((member) => member.id !== currentAccountId),
    [build.members, currentAccountId],
  );

  const memberIds = useMemo(
    () => new Set(members.map((member) => member.id)),
    [members],
  );

  // Members who already submitted an active review can't be toggled: they show
  // up selected and disabled.
  const reviewedKeys = useMemo(() => {
    const reviewed = new Set(
      getLatestActiveReviewByUser(build.reviews)
        .map((review) => review.user?.id)
        .filter((id): id is string => Boolean(id)),
    );
    return members.map((member) => member.id).filter((id) => reviewed.has(id));
  }, [members, build.reviews]);

  // Requested reviewers that are still toggleable (members that haven't reviewed
  // yet). A requested user who lost access stays pending but isn't manageable
  // here.
  const requestedKeys = useMemo(() => {
    const reviewed = new Set(reviewedKeys);
    return build.reviewers
      .map((reviewer) => reviewer.id)
      .filter((id) => memberIds.has(id) && !reviewed.has(id));
  }, [build.reviewers, memberIds, reviewedKeys]);

  // Optimistic selection: reflect the click immediately, then reconcile with the
  // server's requested set whenever it changes (React's "adjust state during
  // render" pattern — avoids a setState-in-effect).
  const [requested, setRequested] = useState(() => new Set(requestedKeys));
  const [syncedKeys, setSyncedKeys] = useState(requestedKeys);
  if (syncedKeys !== requestedKeys) {
    setSyncedKeys(requestedKeys);
    setRequested(new Set(requestedKeys));
  }

  const selectedKeys = useMemo(
    () => new Set([...requested, ...reviewedKeys]),
    [requested, reviewedKeys],
  );
  const disabledKeys = useMemo(() => new Set(reviewedKeys), [reviewedKeys]);

  const handleSelectionChange = (keys: Selection) => {
    if (keys === "all") {
      return;
    }
    // Disabled (already reviewed) keys stay selected — only diff the toggleable
    // ones.
    const reviewed = new Set(reviewedKeys);
    const next = new Set(
      Array.from(keys, String).filter((id) => !reviewed.has(id)),
    );
    const added = [...next].filter((id) => !requested.has(id));
    const removed = [...requested].filter((id) => !next.has(id));
    setRequested(next);
    const revert = () => setRequested(new Set(requestedKeys));
    if (added.length > 0) {
      client
        .mutate({
          mutation: AddBuildReviewersMutation,
          variables: {
            input: { buildId: build.id, userIds: added },
            accountSlug: projectParams.accountSlug,
            projectName: projectParams.projectName,
          },
        })
        .catch(revert);
    }
    if (removed.length > 0) {
      client
        .mutate({
          mutation: RemoveBuildReviewersMutation,
          variables: {
            input: { buildId: build.id, userIds: removed },
            accountSlug: projectParams.accountSlug,
            projectName: projectParams.projectName,
          },
        })
        .catch(revert);
    }
  };

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <HotkeyTooltip description="Add reviewer" keys={hotkey.displayKeys}>
        <IconButton rounded size="small" aria-label="Add reviewer">
          <PlusIcon />
        </IconButton>
      </HotkeyTooltip>
      <Popover placement="bottom end" className="bg-app min-w-56">
        <Autocomplete filter={contains}>
          <div className="flex w-full flex-col gap-1" data-hotkeys-disabled>
            <SearchField
              aria-label="Search members"
              autoFocus
              className="border-b"
            >
              <div className="relative flex items-center px-3 py-1.5">
                <SearchIcon className="text-placeholder mr-2 size-4 shrink-0" />
                <Input
                  className="placeholder:text-placeholder w-full bg-transparent text-sm outline-none"
                  placeholder="Search members…"
                />
              </div>
            </SearchField>
            <Menu
              aria-label="Project members"
              className="max-h-64 w-full overflow-y-auto"
              selectionMode="multiple"
              selectedKeys={selectedKeys}
              disabledKeys={disabledKeys}
              onSelectionChange={handleSelectionChange}
              items={members}
              renderEmptyState={() => (
                <p className="text-low px-2 py-1.5 text-xs">No members found</p>
              )}
            >
              {(member) => (
                <MenuItem
                  id={member.id}
                  textValue={[member.name, member.slug]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <AccountAvatar
                    avatar={member.avatar}
                    className="mr-2 size-5 shrink-0"
                    alt={member.name ?? undefined}
                  />
                  <span className="truncate">{member.name || member.slug}</span>
                </MenuItem>
              )}
            </Menu>
          </div>
        </Autocomplete>
      </Popover>
    </MenuTrigger>
  );
}

function ReviewActionsMenu(props: { review: Review; onDismiss: () => void }) {
  if (props.review.dismissedAt) {
    return null;
  }

  return (
    <MenuTrigger>
      <IconButton
        rounded
        data-actions-menu=""
        size="small"
        aria-label="Review actions"
      >
        <MoreHorizontalIcon />
      </IconButton>
      <Popover placement="bottom end">
        <Menu aria-label="Review actions">
          <MenuItem variant="danger" onAction={props.onDismiss}>
            <MenuItemIcon>
              <BanIcon />
            </MenuItemIcon>
            Dismiss review
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

function DismissReviewDialog(props: {
  review: Review;
  loading: boolean;
  error: unknown;
  onDismiss: () => void;
}) {
  const reviewerName =
    props.review.user?.name || props.review.user?.slug || "this user";

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Dismiss review</DialogTitle>
        <DialogText>
          Dismissing <strong>{reviewerName}</strong>&apos;s review can affect
          the status of this build.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {props.error ? (
          <ErrorMessage>{getErrorMessage(props.error)}</ErrorMessage>
        ) : null}
        <DialogDismiss isDisabled={props.loading}>Cancel</DialogDismiss>
        <Button
          isDisabled={props.loading}
          variant="destructive"
          onPress={props.onDismiss}
        >
          Dismiss review
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
