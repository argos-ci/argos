import { useMutation } from "@apollo/client";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
} from "@/ui/Dialog";

const DeactivateAutomationRuleMutation = graphql(`
  mutation DeleteAutomation_deactivateAutomationRule($id: String!) {
    deactivateAutomationRule(id: $id) {
      id
    }
  }
`);

export function DeleteAutomationDialog(props: {
  automationRuleId: string;
  projectId: string;
  onCompleted?: () => void;
}) {
  const { automationRuleId, projectId, onCompleted } = props;
  const [deactivateAutomationRule] = useMutation(
    DeactivateAutomationRuleMutation,
    {
      variables: { id: automationRuleId },
      onCompleted,
      update(cache, { data }) {
        if (!data?.deactivateAutomationRule?.id) {
          return;
        }
        const { id } = data.deactivateAutomationRule;
        // Find the project id in the cache
        const projectGqlID = cache.identify({
          __typename: "Project",
          id: projectId,
        });

        if (projectGqlID) {
          cache.modify({
            id: projectGqlID,
            fields: {
              automationRules(existingAutomationRules = {}, { readField }) {
                if (!existingAutomationRules.edges) {
                  return existingAutomationRules;
                }

                return {
                  ...existingAutomationRules,
                  edges: existingAutomationRules.edges.filter(
                    (ruleRef: any) => readField("id", ruleRef) !== id,
                  ),
                  pageInfo: {
                    ...existingAutomationRules.pageInfo,
                    totalCount: existingAutomationRules.pageInfo.totalCount - 1,
                  },
                };
              },
            },
          });
        }
      },
    },
  );
  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Delete Automation</DialogTitle>
        <DialogText>
          The automation rule will be permanently deleted. This action cannot be
          undone.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          onPress={() => {
            deactivateAutomationRule().catch((error) => {
              console.error("Failed to delete automation rule:", error);
            });
          }}
        >
          Delete
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
