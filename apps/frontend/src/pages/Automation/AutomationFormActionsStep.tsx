import { Key } from "react-aria";
import { useFormContext } from "react-hook-form";

import { AutomationActionType } from "@/gql/graphql";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { ActionBadge, RemovableTask, StepTitle } from "./AutomationForm";
import { NewAutomationInputs } from "./NewAutomation";

type Action = {
  type: AutomationActionType;
  label: string;
};

const ACTIONS: Action[] = [
  { type: AutomationActionType.SendSlackMessage, label: "Send Slack Message" },
];

const SendSlackMessageAction = ({ actionIndex }: { actionIndex: number }) => {
  const form = useFormContext<NewAutomationInputs>();

  return (
    <div className="flex items-center gap-2 overflow-auto">
      <div>Send message to Slack channel</div>
      <FormTextInput
        {...form.register(`actions.${actionIndex}.payload.slackId`, {
          maxLength: {
            value: 11,
            message: "Name must be 100 characters or less",
          },
          required: "Slack channel ID is required",
        })}
        label="Slack Channel"
        hiddenLabel
        placeholder="Channel ID, eg. C07VDNT3CTX"
        className="w-64"
      />
      <FormTextInput
        {...form.register(`actions.${actionIndex}.payload.name`, {
          maxLength: {
            value: 100,
            message: "Name must be 100 characters or less",
          },
          required: "Slack channel name is required",
        })}
        label="Slack Channel Name"
        hiddenLabel
        placeholder="name, eg. #general"
        className="w-64"
      />
    </div>
  );
};

const ActionDetail = ({
  actionType,
  actionIndex,
}: {
  actionType: string;
  actionIndex: number;
}) => {
  switch (actionType) {
    case "sendSlackMessage":
      return <SendSlackMessageAction actionIndex={actionIndex} />;

    default:
      return (
        <div key={actionType} className="text-danger-low">
          Unknown action type: {actionType}
        </div>
      );
  }
};

export const AutomationActionsStep = () => {
  const form = useFormContext<NewAutomationInputs>();
  const selectedActions = form.watch("actions");

  function onRemove(index: number) {
    form.setValue(
      "actions",
      selectedActions.filter((_, i) => i !== index),
    );
  }

  function onSelectionChange(key: Key) {
    form.setValue("actions", [
      ...selectedActions,
      {
        type: key as AutomationActionType,
        payload: {},
      },
    ]);
  }

  return (
    <div>
      <StepTitle>
        <ActionBadge>THEN</ActionBadge> perform these actions
      </StepTitle>
      <div className="flex flex-col gap-2">
        {selectedActions.map((selectedAction, index) => {
          return (
            <RemovableTask key={index} onRemove={() => onRemove(index)}>
              <ActionDetail
                actionType={selectedAction.type}
                actionIndex={index}
              />
            </RemovableTask>
          );
        })}

        <Select aria-label="Action Types" onSelectionChange={onSelectionChange}>
          <SelectButton className="w-full">Add action...</SelectButton>
          <Popover>
            <ListBox>
              {ACTIONS.map((c) => (
                <ListBoxItem key={c.type} id={c.type}>
                  {c.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
};
