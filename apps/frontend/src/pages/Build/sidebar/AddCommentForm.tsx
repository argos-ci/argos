import { ComponentProps, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { EyeOffIcon } from "lucide-react";
import { Button } from "react-aria-components";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { Tooltip } from "@/ui/Tooltip";
import { useAltKeyHeld } from "@/ui/useAltKeyHeld";
import { getErrorMessage } from "@/util/error";

import { useBuildDiffState } from "../BuildDiffState";
import {
  ReviewCommentSubmitButton,
  useCanAddToReview,
} from "../ReviewCommentSubmitButton";
import { useMentionableUsers } from "./MentionableUsersContext";
import { ScreenshotDiffThumbnail } from "./ScreenshotDiffThumbnail";

const _BuildFragment = graphql(`
  fragment AddCommentForm_Build on Build {
    id
    ...ReviewCommentSubmitButton_Build
  }
`);

const AddBuildCommentMutation = graphql(`
  mutation AddCommentForm_addBuildComment(
    $input: AddBuildCommentInput!
    $accountSlug: String!
    $projectName: String!
  ) {
    addBuildComment(input: $input) {
      id
      subscribed
      comments {
        ...CommentCard_Comment
      }
    }
  }
`);

/**
 * A compact control next to the send button showing the snapshot the comment
 * will be attached to: a tiny thumbnail and its name. Clicking toggles the
 * attachment off (muted) or back on, so the user can opt out and back in
 * without losing what they were looking at.
 */
function AttachedSnapshotToggle(props: {
  name: string;
  screenshotDiff: ComponentProps<
    typeof ScreenshotDiffThumbnail
  >["screenshotDiff"];
  attached: boolean;
  onToggle: () => void;
}) {
  const { name, screenshotDiff, attached, onToggle } = props;
  return (
    <Tooltip
      content={
        attached
          ? "This snapshot is attached to your comment. Click to detach it."
          : "Click to attach this snapshot to your comment."
      }
    >
      <Button
        onPress={onToggle}
        aria-pressed={attached}
        aria-label={`${attached ? "Detach" : "Attach"} snapshot ${name}`}
        className={clsx(
          "border-thin hover:bg-hover rac-focus flex min-w-0 items-center gap-1.5 rounded-md py-0.5 pr-2 pl-1 text-xs transition",
          attached ? "text-default" : "text-low opacity-60",
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {attached ? (
            <ScreenshotDiffThumbnail
              screenshotDiff={screenshotDiff}
              className="size-4"
              iconClassName="size-3.5"
              fit="cover"
            />
          ) : (
            <EyeOffIcon className="text-low size-3.5" />
          )}
        </span>
        <span className="min-w-0 truncate font-medium">{name}</span>
      </Button>
    </Tooltip>
  );
}

export function AddCommentForm(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;
  const mentions = useMentionableUsers();
  const projectParams = useProjectParams();
  invariant(projectParams);
  const { activeDiff } = useBuildDiffState();
  // Attach the snapshot currently in view by default; the user can toggle it
  // off and back on. Reset after each submit so the next comment again follows
  // the view.
  const [detached, setDetached] = useState(false);
  const attachedDiff = detached ? null : activeDiff;
  const canAddToReview = useCanAddToReview(build);
  const altHeld = useAltKeyHeld();
  const client = useApolloClient();
  const handleSubmit = async (body: EditorValue) => {
    try {
      await client.mutate({
        mutation: AddBuildCommentMutation,
        variables: {
          input: {
            buildId: build.id,
            body,
            addToReview: canAddToReview && !altHeld,
            ...(attachedDiff ? { screenshotDiffId: attachedDiff.id } : null),
          },
          accountSlug: projectParams.accountSlug,
          projectName: projectParams.projectName,
        },
      });
      setDetached(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };
  return (
    <StandaloneEditor
      onSubmit={handleSubmit}
      draftKey={`build.${build.id}.comment`}
      mentions={mentions}
      placeholder="Leave a comment…"
      submitLabel="Submit the comment"
      emptyMessage={{
        title: "Comment required",
        description: "Please add a comment before submitting.",
      }}
      aria-label="Add a comment"
      renderSubmit={({ submit, isEmpty, isPending, disabled }) => (
        <ReviewCommentSubmitButton
          canAddToReview={canAddToReview}
          altHeld={altHeld}
          fallbackLabel="Submit the comment"
          isEmpty={isEmpty}
          isPending={isPending}
          disabled={disabled}
          onPress={submit}
        />
      )}
      footerStart={
        activeDiff ? (
          <AttachedSnapshotToggle
            name={activeDiff.name}
            screenshotDiff={activeDiff}
            attached={attachedDiff != null}
            onToggle={() => setDetached((value) => !value)}
          />
        ) : undefined
      }
    />
  );
}
