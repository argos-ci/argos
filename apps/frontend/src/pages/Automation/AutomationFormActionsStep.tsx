import { assertNever } from "@argos/util/assertNever";
import { Key } from "react-aria";

import { AutomationActionType } from "@/gql/graphql";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { ActionBadge, RemovableTask, StepTitle } from "./AutomationForm";
import type { AutomationForm } from "./types";

type Action = { type: AutomationActionType; label: string };

const ACTIONS = [
  { type: AutomationActionType.SendSlackMessage, label: "Send Slack Message" },
] satisfies Action[];

function SendSlackMessageAction(props: {
  actionIndex: number;
  form: AutomationForm;
}) {
  const { actionIndex, form } = props;

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
}

function ActionDetail(props: {
  actionType: AutomationActionType;
  actionIndex: number;
  form: AutomationForm;
}) {
  const { actionType, actionIndex, form } = props;
  switch (actionType) {
    case AutomationActionType.SendSlackMessage:
      return <SendSlackMessageAction form={form} actionIndex={actionIndex} />;
    default:
      assertNever(actionType, "Unknown action type");
  }
}

export function AutomationActionsStep(props: { form: AutomationForm }) {
  const { form } = props;
  const name = "actions";
  const selectedActions = form.watch(name);

  function onRemove(index: number) {
    form.setValue(
      name,
      selectedActions.filter((_, i) => i !== index),
    );
  }

  function onSelectionChange(key: Key) {
    form.setValue(name, [
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
        <ActionBadge>Then</ActionBadge> perform these actions
      </StepTitle>
      <div className="flex flex-col gap-2">
        {selectedActions.map((selectedAction, index) => {
          return (
            <RemovableTask key={index} onRemove={() => onRemove(index)}>
              <ActionDetail
                form={form}
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
}
