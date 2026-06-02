import { useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { toast } from "sonner";

import { DocumentType, graphql } from "@/gql";
import { useProjectParams } from "@/pages/Project/ProjectParams";
import { type EditorValue } from "@/ui/Editor/Editor";
import { StandaloneEditor } from "@/ui/Editor/StandaloneEditor";
import { getErrorMessage } from "@/util/error";

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

export function AddCommentForm(props: {
  build: DocumentType<typeof _BuildFragment>;
}) {
  const { build } = props;
  const mentions = useMentionableUsers();
  const projectParams = useProjectParams();
  invariant(projectParams);
  const [addBuildComment] = useMutation(AddBuildCommentMutation);
  const handleSubmit = async (body: EditorValue) => {
    try {
      await addBuildComment({
        variables: {
          input: { buildId: build.id, body },
          accountSlug: projectParams.accountSlug,
          projectName: projectParams.projectName,
        },
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      // Rethrow so the editor keeps the content and the user can retry.
      throw error;
    }
  };
  return (
    <StandaloneEditor
      onSubmit={handleSubmit}
      mentions={mentions}
      placeholder="Leave a comment…"
      submitLabel="Submit the comment"
      emptyMessage={{
        title: "Comment required",
        description: "Please add a comment before submitting.",
      }}
      aria-label="Add a comment"
    />
  );
}
