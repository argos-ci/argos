import { useController } from "react-hook-form";

import { AutomationEvent } from "@/gql/graphql";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroup } from "@/ui/CheckboxGroup";

import { ActionBadge, StepTitle } from "./AutomationForm";
import type { AutomationForm } from "./types";

export const AutomationWhenStep = (props: { form: AutomationForm }) => {
  const { form } = props;
  const controller = useController({
    control: form.control,
    name: "actions",
    rules: {
      required: "At least one event must be selected",
    },
  });

  return (
    <div>
      <StepTitle>
        <ActionBadge>When</ActionBadge> any of the following event happens
      </StepTitle>

      <CheckboxGroup
        className="text-sm"
        onChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
        name={controller.field.name}
        validationBehavior="aria"
        isInvalid={controller.fieldState.invalid}
        errorMessage={controller.fieldState.error?.message}
      >
        <Checkbox
          ref={controller.field.ref}
          value={AutomationEvent.BuildCompleted}
        >
          Build Completed
        </Checkbox>
        <Checkbox value={AutomationEvent.BuildReviewed}>
          Build Reviewed
        </Checkbox>
      </CheckboxGroup>
    </div>
  );
};
