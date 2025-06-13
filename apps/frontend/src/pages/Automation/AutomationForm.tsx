import { Trash2Icon } from "lucide-react";
import { Path, useFormContext } from "react-hook-form";
import { twc } from "react-twc";

import { Badge, type BadgeProps } from "@/ui/Badge";
import { FormTextInput } from "@/ui/FormTextInput";
import { IconButton } from "@/ui/IconButton";

import { EditAutomationInputs } from "./EditAutomation";
import { NewAutomationInputs } from "./NewAutomation";

export const ActionBadge = twc(
  Badge,
)<BadgeProps>`bg-primary-active text-primary w-13 inline-flex justify-center uppercase`;

export const StepTitle = twc.div`flex items-center gap-2 mb-2`;

export const RemovableTask = ({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) => {
  return (
    <div
      role="listitem"
      className="bg-ui grid grid-cols-[1fr_auto] items-center gap-4 rounded border px-3 py-1.5 text-sm"
    >
      {children}
      <IconButton onClick={onRemove} aria-label="Remove">
        <Trash2Icon />
      </IconButton>
    </div>
  );
};

export type AutomationRuleFormInputs =
  | NewAutomationInputs
  | EditAutomationInputs;

export const AutomationNameField = <T extends AutomationRuleFormInputs>({
  name,
  form,
}: {
  name: Path<T>;
  form: ReturnType<typeof useFormContext<T>>;
}) => {
  return (
    <FormTextInput
      {...form.register(name, {
        required: "Please enter a name",
        minLength: {
          value: 3,
          message: "Name must be at least 3 characters",
        },
        maxLength: {
          value: 100,
          message: "Name must be 100 characters or less",
        },
      })}
      label="Automation rule name"
      placeholder="eg. Notify Slack on build completion"
      autoComplete="off"
    />
  );
};

export const FormErrors = ({
  form,
}: {
  form: ReturnType<typeof useFormContext<AutomationRuleFormInputs>>;
}) => {
  const rootError = form.formState.errors.root;

  return (
    <div className="text-danger-low">
      {rootError &&
        Object.entries(rootError).map(([field, error]) => (
          <div key={field}>
            {(error as { message?: string }).message || "Invalid value"}
          </div>
        ))}
    </div>
  );
};
