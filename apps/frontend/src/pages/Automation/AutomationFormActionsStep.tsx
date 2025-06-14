import { assertNever } from "@argos/util/assertNever";
import { FieldError } from "react-aria-components";
import { useController, useFieldArray } from "react-hook-form";

import { AutomationActionType } from "@/gql/graphql";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import { ActionBadge, RemovableTask, StepTitle } from "./AutomationForm";
import type { AutomationForm } from "./types";

function SendSlackMessageAction(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const { name, form } = props;
  // When we add a second action, types will break here, we will need to handle it
  // not sure how to do that yet

  return (
    <div className="flex items-center gap-2 overflow-auto">
      <div>Send message to Slack channel</div>
      <FormTextInput
        {...form.register(`${name}.payload.slackId`)}
        orientation="horizontal"
        label="Slack Channel"
        hiddenLabel
        placeholder="Channel ID, eg. C07VDNT3CTX"
        className="w-64"
      />
      <FormTextInput
        {...form.register(`${name}.payload.name`)}
        orientation="horizontal"
        label="Slack Channel Name"
        hiddenLabel
        placeholder="name, eg. #general"
        className="w-64"
      />
    </div>
  );
}

function ActionDetail(props: {
  form: AutomationForm;
  name: `actions.${number}`;
}) {
  const { name, form } = props;
  const field = form.watch(name);
  switch (field.type) {
    case AutomationActionType.SendSlackMessage:
      return <SendSlackMessageAction form={form} name={name} />;
    default:
      assertNever(field.type, "Unknown action type");
  }
}

export function AutomationActionsStep(props: { form: AutomationForm }) {
  const { form } = props;
  const name = "actions" as const;
  const actions = [
    {
      type: AutomationActionType.SendSlackMessage,
      label: "Send Slack Message",
    },
  ];
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });
  const controller = useController({
    control: form.control,
    name,
  });

  return (
    <div>
      <StepTitle>
        <ActionBadge>Then</ActionBadge> perform these actions
      </StepTitle>
      <div className="flex flex-col gap-2">
        {fields.map((_field, index) => {
          return (
            <RemovableTask key={index} onRemove={() => remove(index)}>
              <ActionDetail form={form} name={`${name}.${index}`} />
            </RemovableTask>
          );
        })}
        <Select
          ref={controller.field.ref}
          aria-label="Action Types"
          name={controller.field.name}
          onBlur={controller.field.onBlur}
          isDisabled={controller.field.disabled}
          isInvalid={Boolean(controller.fieldState.error?.message)}
          selectedKey={null}
          onSelectionChange={(key) => {
            switch (key) {
              case AutomationActionType.SendSlackMessage: {
                append({
                  type: AutomationActionType.SendSlackMessage,
                  payload: {
                    name: "",
                    slackId: "",
                  },
                });
                return;
              }
              default:
                throw new Error(`Unknown action type: ${key}`);
            }
          }}
        >
          <SelectButton className="w-full">Add action...</SelectButton>
          <FieldError className="text-danger-low text-sm">
            {controller.fieldState.error?.message}
          </FieldError>
          <Popover>
            <ListBox>
              {actions.map((action) => (
                <ListBoxItem
                  key={action.type}
                  id={action.type}
                  textValue={action.label}
                >
                  {action.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
}
