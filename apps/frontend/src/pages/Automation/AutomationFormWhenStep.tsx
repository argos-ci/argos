import { useController } from "react-hook-form";

import { AutomationEvent } from "@/gql/graphql";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroup } from "@/ui/CheckboxGroup";

import { ActionBadge, StepTitle } from "./AutomationForm";
import type { AutomationForm } from "./types";

export function AutomationWhenStep(props: { form: AutomationForm }) {
  const { form } = props;
  const controller = useController({
    control: form.control,
    name: "events",
  });

  return (
    <div>
      <StepTitle>
        <ActionBadge>When</ActionBadge> any of the following event happens
      </StepTitle>

      <CheckboxGroup
        aria-label="Automation events"
        className="text-sm"
        validationBehavior="aria"
        onChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
        name={controller.field.name}
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
}
