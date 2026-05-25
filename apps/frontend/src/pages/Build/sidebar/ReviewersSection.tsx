import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { BanIcon, MoreVerticalIcon } from "lucide-react";

import {
  BuildReviewersStatusList,
  getLatestReviewByUser,
} from "@/containers/BuildReviewersStatusList";
import { ProjectPermissionsContext } from "@/containers/Project/PermissionsContext";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType, ProjectPermission } from "@/gql/graphql";
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
import { IconButton } from "@/ui/IconButton";
import { Menu, MenuItem, MenuItemIcon, MenuTrigger } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";
import { getErrorMessage } from "@/util/error";
import { useNonNullable } from "@/util/useNonNullable";

const _BuildFragment = graphql(`
  fragment ReviewersSection_Build on Build {
    status
    type
    mergeQueue
    reviews {
      id
      date
      state
      dismissedAt
      user {
        id
        name
        slug
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

const DismissReviewMutation = graphql(`
  mutation ReviewersSection_dismissReview($input: DismissReviewInput!) {
    dismissReview(input: $input) {
      id
      status
      ...BuildStatusChip_Build
      ...ReviewersSection_Build
      ...ReviewActivitySection_Build
    }
  }
`);

type Build = DocumentType<typeof _BuildFragment>;
type Review = Build["reviews"][number];

function getEmptyStateMessage(build: Build): string {
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
  const permissions = useNonNullable(ProjectPermissionsContext);
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
  const reviewers = getLatestReviewByUser(build.reviews);
  return (
    <SidebarSection>
      <SidebarHeader>
        <SidebarHeading>Reviewers</SidebarHeading>
      </SidebarHeader>
      {reviewers.length === 0 ? (
        <div className="text-low px-4 text-xs">
          {getEmptyStateMessage(build)}
        </div>
      ) : (
        <BuildReviewersStatusList
          reviews={reviewers}
          className="gap-3"
          itemClassName="px-4 pr-3"
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
                },
              }).catch(() => {});
            }}
          />
        ) : null}
      </Modal>
    </SidebarSection>
  );
}

function ReviewActionsMenu(props: { review: Review; onDismiss: () => void }) {
  if (props.review.dismissedAt) {
    return null;
  }

  return (
    <MenuTrigger>
      <IconButton size="small" aria-label="Review actions">
        <MoreVerticalIcon />
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
    <Dialog size="medium">
      <DialogBody confirm>
        <DialogTitle>Dismiss review</DialogTitle>
        <DialogText>
          Dismissing <strong>{reviewerName}</strong>&apos;s review can affect
          the status of this build.
        </DialogText>
        <DialogText>Are you sure you want to continue?</DialogText>
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
