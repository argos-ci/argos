import { Controller, useFormContext } from "react-hook-form";
import type { Path } from "react-hook-form";

import { AutomationEvent } from "@/gql/graphql";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroup } from "@/ui/CheckboxGroup";

import {
  ActionBadge,
  AutomationRuleFormInputs,
  StepTitle,
} from "./AutomationForm";

export const AutomationWhenStep = <T extends AutomationRuleFormInputs>({
  form,
}: {
  form: ReturnType<typeof useFormContext<T>>;
}) => {
  return (
    <div>
      <StepTitle>
        <ActionBadge>When</ActionBadge> any of the following event happens
      </StepTitle>

      <Controller
        control={form.control}
        name={"events" as Path<T>}
        render={({ field }) => (
          <CheckboxGroup
            className="text-sm"
            value={field.value}
            onChange={field.onChange}
            isRequired
          >
            <Checkbox value={AutomationEvent.BuildCompleted}>
              Build Completed
            </Checkbox>
            <Checkbox value={AutomationEvent.BuildReviewed}>
              Build Reviewed
            </Checkbox>
          </CheckboxGroup>
        )}
      />
    </div>
  );
};
