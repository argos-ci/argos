import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { FieldError } from "@/ui/FieldError";

import { ActionBadge, StepTitle, type AutomationForm } from "./AutomationForm";

export function AutomationWhenStep(props: { form: AutomationForm }) {
  const { form } = props;

  return (
    <div>
      <StepTitle>
        <ActionBadge>When</ActionBadge> any of the following event happens
      </StepTitle>

      <CheckboxGroupField
        control={form.control}
        name="events"
        aria-label="Automation events"
        className="text-sm"
      >
        <Checkbox value="build.completed">Build Completed</Checkbox>
        <Checkbox value="build.reviewed">Build Reviewed</Checkbox>
        <FieldError />
      </CheckboxGroupField>
    </div>
  );
}
