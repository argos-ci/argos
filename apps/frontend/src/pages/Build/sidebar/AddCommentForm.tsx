import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { EyeOffIcon, ImageIcon } from "lucide-react";
import { Button } from "react-aria-components";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { ImageKitPicture } from "@/ui/ImageKitPicture";
import { Tooltip } from "@/ui/Tooltip";
import { getErrorMessage } from "@/util/error";

import { useBuildDiffState } from "../BuildDiffState";
import { useMentionableUsers } from "./MentionableUsersContext";

const _BuildFragment = graphql(`
  fragment AddCommentForm_Build on Build {
    id
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
  thumbnailUrl: string | null;
  attached: boolean;
  onToggle: () => void;
}) {
  const { name, thumbnailUrl, attached, onToggle } = props;
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
          "border-thin hover:bg-hover rac-focus flex min-w-0 items-center gap-1.5 rounded-md py-0.5 pr-2 pl-0.5 text-xs transition",
          attached ? "text-default" : "text-low opacity-60",
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {!attached ? (
            <EyeOffIcon className="text-low size-3" />
          ) : thumbnailUrl ? (
            <span className="block size-4 overflow-hidden rounded-sm border bg-white">
              <ImageKitPicture
                src={thumbnailUrl}
                transformations={["w-32", "h-32", "c-at_max"]}
                className="size-full object-cover"
                alt=""
              />
            </span>
          ) : (
            <ImageIcon className="size-4" />
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
  const [addBuildComment] = useMutation(AddBuildCommentMutation);
  const handleSubmit = async (body: EditorValue) => {
    try {
      await addBuildComment({
        variables: {
          input: {
            buildId: build.id,
            body,
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
  const thumbnailUrl =
    activeDiff?.compareScreenshot?.url ??
    activeDiff?.baseScreenshot?.url ??
    null;
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
      footerStart={
        activeDiff ? (
          <AttachedSnapshotToggle
            name={activeDiff.name}
            thumbnailUrl={thumbnailUrl}
            attached={attachedDiff != null}
            onToggle={() => setDetached((value) => !value)}
          />
        ) : undefined
      }
    />
  );
}
