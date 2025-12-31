import { AutomationFormConditionSchema } from "@argos/schemas/automation-condition";
import { AutomationEventSchema } from "@argos/schemas/automation-event";
import { Trash2Icon } from "lucide-react";
import type { PressEvent } from "react-aria";
import type { UseFormReturn } from "react-hook-form";
import { twc } from "react-twc";
import { z } from "zod/v4";

import { FormTextInput } from "@/ui/FormTextInput";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";
import { AutomationActionSchema } from "@/util/automation";

export const AutomationFieldValuesSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Please enter a name" })
    .min(3, { message: "Must be at least 3 characters" })
    .max(100, { message: "Must be 100 characters or less" }),
  events: z
    .array(AutomationEventSchema)
    .min(1, "At least one event is required"),
  conditions: z.array(AutomationFormConditionSchema),
  actions: z
    .array(AutomationActionSchema)
    .min(1, "At least one action is required"),
});

type AutomationFieldValues = z.input<typeof AutomationFieldValuesSchema>;
export type AutomationTransformedValues = z.output<
  typeof AutomationFieldValuesSchema
>;

export type AutomationForm = UseFormReturn<
  AutomationFieldValues,
  any,
  AutomationTransformedValues
>;

export const ActionBadge = twc.div`bg-primary-active text-primary w-16 inline-flex justify-center uppercase mr-0.5 py-0.5 font-medium text-sm rounded`;

export const StepTitle = twc.div`mb-3`;

export function Task(props: { children: React.ReactNode }) {
  const { children } = props;
  return (
    <div className="bg-subtle grid grid-cols-[1fr_auto] items-center gap-4 rounded border px-3 py-1.5 text-sm">
      {children}
    </div>
  );
}

export function RemoveButton(props: { onPress: (e: PressEvent) => void }) {
  return (
    <Tooltip content="Remove">
      <IconButton onPress={props.onPress} aria-label="Remove">
        <Trash2Icon />
      </IconButton>
    </Tooltip>
  );
}

export function AutomationNameField(props: { form: AutomationForm }) {
  const { form } = props;
  return (
    <FormTextInput
      control={form.control}
      {...form.register("name")}
      label="Automation rule name"
      placeholder="eg. Notify team in Slack when a build completes"
      autoComplete="off"
      autoFocus
    />
  );
}

/**
 * Converts the form data from the AutomationForm into a format suitable for GraphQL variables.
 */
export function formDataToVariables(data: AutomationTransformedValues) {
  return {
    name: data.name,
    events: data.events,
    conditions: data.conditions,
    actions: data.actions,
  };
}
