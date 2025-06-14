import { assertNever } from "@argos/util/assertNever";
import { Trash2Icon } from "lucide-react";
import { twc } from "react-twc";
import { z } from "zod/v4";

import { AutomationActionType, AutomationConditionType } from "@/gql/graphql";
import { Badge, type BadgeProps } from "@/ui/Badge";
import { FormTextInput } from "@/ui/FormTextInput";
import { IconButton } from "@/ui/IconButton";
import { Tooltip } from "@/ui/Tooltip";

import type { AutomationForm, AutomationTransformedValues } from "./types";

export const ActionBadge = twc(
  Badge,
)<BadgeProps>`bg-primary-active text-primary w-13 inline-flex justify-center uppercase`;

export const StepTitle = twc.div`flex items-center gap-2 mb-2`;

export function RemovableTask(props: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  const { children, onRemove } = props;
  return (
    <div className="bg-subtle grid grid-cols-[1fr_auto] items-center gap-4 rounded border px-3 py-1.5 text-sm">
      {children}
      <Tooltip content="Remove">
        <IconButton onClick={onRemove} aria-label="Remove">
          <Trash2Icon />
        </IconButton>
      </Tooltip>
    </div>
  );
}

export function AutomationNameField(props: { form: AutomationForm }) {
  const { form } = props;
  return (
    <FormTextInput
      {...form.register("name")}
      label="Automation rule name"
      placeholder="eg. Notify Slack on build completion"
      autoComplete="off"
      autoFocus
    />
  );
}

export function FormErrors(props: { form: AutomationForm }) {
  const rootError = props.form.formState.errors.root;
  return (
    <div className="text-danger-low empty:hidden">
      {rootError &&
        Object.entries(rootError).map(([field, error]) => (
          <div key={field}>
            {(error as { message?: string }).message || "Invalid value"}
          </div>
        ))}
    </div>
  );
}

/**
 * Converts the form data from the AutomationForm into a format suitable for GraphQL variables.
 */
export function formDataToVariables(data: AutomationTransformedValues) {
  return {
    name: data.name,
    events: data.events,
    conditions: z
      .array(
        z.object({
          type: z.enum(AutomationConditionType),
          value: z.string(),
        }),
      )
      .parse(data.conditions),
    actions: data.actions.map(({ type, payload }) => {
      switch (type) {
        case AutomationActionType.SendSlackMessage:
          return {
            type: type,
            payload: {
              name: payload.name,
              slackId: payload.slackId,
            },
          };

        default:
          assertNever(type, `Unknown action type: ${type}`);
      }
    }),
  };
}
