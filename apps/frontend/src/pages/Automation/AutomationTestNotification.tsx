import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CheckIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { handleFormError } from "@/ui/Form";

import type { AutomationTransformedValues } from "./AutomationForm";

const TestAutomationMutation = graphql(`
  mutation EditAutomation_testAutomation(
    $event: String!
    $projectId: String!
    $actions: [AutomationActionInput!]!
  ) {
    testAutomation(
      input: { event: $event, projectId: $projectId, actions: $actions }
    )
  }
`);

interface UseTestAutomationProps {
  projectId: string;
  form: UseFormReturn<AutomationTransformedValues>;
}

function useTestAutomation(props: UseTestAutomationProps) {
  const { form } = props;
  const [isSent, setIsSent] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [test, testResult] = useMutation(TestAutomationMutation, {
    onCompleted: (data) => {
      if (data) {
        setIsSent(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setIsSent(false), 2000);
      }
    },
  });
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSent,
    buttonProps: {
      isPending: testResult.loading,
      onPress: async () => {
        try {
          form.clearErrors();
          const data = form.getValues();
          const eventType = data.events[0];
          if (!eventType) {
            form.setError("root.serverError", {
              message: "At least one event is required to test the automation.",
            });
            return;
          }
          if (data.actions.length === 0) {
            form.setError("root.serverError", {
              message:
                "At least one action is required to test the automation.",
            });
            return;
          }
          await test({
            variables: {
              event: eventType,
              projectId: props.projectId,
              actions: data.actions,
            },
          });
        } catch (error) {
          handleFormError(form, error);
        }
      },
    },
  };
}

interface TestAutomationButtonProps extends UseTestAutomationProps {
  isDisabled?: boolean;
}

export function TestAutomationButton(props: TestAutomationButtonProps) {
  const { isDisabled } = props;
  const { isSent, buttonProps } = useTestAutomation(props);
  return (
    <Button variant="secondary" {...buttonProps} isDisabled={isDisabled}>
      {isSent ? (
        <>
          <ButtonIcon>
            <CheckIcon className="text-success-low" />
          </ButtonIcon>
          Send Test Notification
        </>
      ) : (
        <>Send Test Notification</>
      )}
    </Button>
  );
}
