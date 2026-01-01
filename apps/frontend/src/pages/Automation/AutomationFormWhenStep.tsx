import { AutomationEvents } from "@argos/schemas/automation-event";

import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { FieldError } from "@/ui/FieldError";
import { getAutomationEventLabel } from "@/util/automation";

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
        {Object.values(AutomationEvents).map((event) => (
          <Checkbox key={event} value={event}>
            {getAutomationEventLabel(event)}
          </Checkbox>
        ))}
        <FieldError />
      </CheckboxGroupField>
    </div>
  );
}
