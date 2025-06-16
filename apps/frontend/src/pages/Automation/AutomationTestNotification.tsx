import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { invariant } from "@argos/util/invariant";
import { CheckIcon } from "lucide-react";

import { graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import { useEventCallback } from "@/ui/useEventCallback";

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

export function useTestAutomation(props: { projectId: string }) {
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

  const onSubmit = useEventCallback(
    async (
      data: AutomationTransformedValues,
      event: React.BaseSyntheticEvent<object, any, any> | undefined,
    ) => {
      if (
        event?.nativeEvent &&
        "submitter" in event.nativeEvent &&
        event.nativeEvent.submitter &&
        typeof event.nativeEvent.submitter === "object" &&
        "name" in event.nativeEvent.submitter &&
        event.nativeEvent.submitter.name === "send-test"
      ) {
        const eventType = data.events[0];
        invariant(eventType, "At least one event is required");
        await test({
          variables: {
            event: eventType,
            projectId: props.projectId,
            actions: data.actions,
          },
        });
        return true;
      }
      return false;
    },
  );

  return {
    onSubmit,
    buttonProps: {
      isPending: testResult.loading,
      isSent,
    },
  };
}

export function TestAutomationButton(props: {
  isDisabled?: boolean;
  isPending: boolean;
  isSent: boolean;
}) {
  return (
    <Button
      className="order-2"
      type="submit"
      variant="secondary"
      name="send-test"
      isPending={props.isPending}
    >
      {props.isSent ? (
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
