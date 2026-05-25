import {
  BuildReviewersStatusList,
  getLatestReviewByUser,
} from "@/containers/BuildReviewersStatusList";
import { DocumentType, graphql } from "@/gql";
import { BuildStatus, BuildType } from "@/gql/graphql";
import { SidebarHeader, SidebarHeading, SidebarSection } from "@/ui/Sidebar";

const _BuildFragment = graphql(`
  fragment ReviewersSection_Build on Build {
    status
    type
    mergeQueue
    reviews {
      id
      date
      state
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

type Build = DocumentType<typeof _BuildFragment>;

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
        <BuildReviewersStatusList reviews={reviewers} itemClassName="px-4" />
      )}
    </SidebarSection>
  );
}
