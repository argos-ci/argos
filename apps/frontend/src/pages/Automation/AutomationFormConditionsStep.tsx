import { assertNever } from "@argos/util/assertNever";
import { Key } from "react-aria";
import { Controller, Path, PathValue, useFormContext } from "react-hook-form";

import { AutomationConditionType, BuildStatus, BuildType } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

import {
  ActionBadge,
  AutomationRuleFormInputs,
  RemovableTask,
  StepTitle,
} from "./AutomationForm";
import { NewAutomationInputs } from "./NewAutomation";

type Condition = { type: AutomationConditionType; label: string };

const CONDITIONS = [
  {
    type: AutomationConditionType.BuildConclusion,
    label: "Build conclusion is",
  },
  { type: AutomationConditionType.BuildType, label: "Build type is" },
  { type: AutomationConditionType.BuildName, label: "Build name is" },
] satisfies Condition[];

const BuildConclusionCondition = () => {
  const form = useFormContext<NewAutomationInputs>();
  const fieldName = `conditions.${AutomationConditionType.BuildConclusion}`;

  const toReadableConclusion = (conclusion: string | null) => {
    return conclusion ? conclusion.toLowerCase().replace(/_/g, " ") : "";
  };

  return (
    <div className="flex items-center gap-2">
      <div>Build label is</div>

      <Controller
        name={fieldName}
        control={form.control}
        render={({ field }) => (
          <Select
            aria-label="Build Conclusion"
            id={fieldName}
            name={field.name}
            selectedKey={field.value}
            onSelectionChange={field.onChange}
          >
            <SelectButton className="text-sm">
              {toReadableConclusion(field.value) ||
                "Select build conclusion..."}
            </SelectButton>
            <Popover>
              <ListBox>
                {[BuildStatus.NoChanges, BuildStatus.ChangesDetected].map(
                  (conclusion) => (
                    <ListBoxItem
                      key={conclusion}
                      id={conclusion}
                      className="text-sm"
                    >
                      {toReadableConclusion(conclusion)}
                    </ListBoxItem>
                  ),
                )}
              </ListBox>
            </Popover>
          </Select>
        )}
      />
    </div>
  );
};

const BuildNameCondition = ({
  projectBuildNames,
}: {
  projectBuildNames: string[];
}) => {
  const form = useFormContext<NewAutomationInputs>();
  const fieldName = `conditions.${AutomationConditionType.BuildName}`;

  return (
    <div className="flex items-center gap-2">
      <div>Build name is</div>
      <Controller
        name={fieldName}
        control={form.control}
        render={({ field }) => (
          <Select
            name={field.name}
            selectedKey={field.value}
            onSelectionChange={field.onChange}
          >
            <SelectButton className="text-sm">
              {field.value || "Select build name..."}
            </SelectButton>
            <Popover>
              <ListBox>
                {projectBuildNames.map((name) => (
                  <ListBoxItem key={name} id={name} className="text-sm">
                    {name}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
      />
    </div>
  );
};

const BuildTypeCondition = () => {
  const form = useFormContext<NewAutomationInputs>();
  const fieldName = `conditions.${AutomationConditionType.BuildType}`;

  return (
    <div className="flex items-center gap-2">
      <div>Build type is</div>
      <Controller
        name={fieldName}
        control={form.control}
        render={({ field }) => (
          <Select
            name={field.name}
            selectedKey={field.value}
            onSelectionChange={field.onChange}
          >
            <SelectButton className="text-sm">
              {field.value || "Select build type..."}
            </SelectButton>
            <Popover>
              <ListBox>
                {Object.values(BuildType).map((type) => (
                  <ListBoxItem key={type} id={type} className="text-sm">
                    {type}
                  </ListBoxItem>
                ))}
              </ListBox>
            </Popover>
          </Select>
        )}
      />
    </div>
  );
};

const ConditionDetail = ({
  conditionType,
  projectBuildNames,
}: {
  conditionType: AutomationConditionType;
  projectBuildNames: string[];
}) => {
  switch (conditionType) {
    case AutomationConditionType.BuildConclusion:
      return <BuildConclusionCondition />;

    case AutomationConditionType.BuildName:
      return <BuildNameCondition projectBuildNames={projectBuildNames} />;

    case AutomationConditionType.BuildType:
      return <BuildTypeCondition />;

    default:
      assertNever(conditionType, `Unknown condition type: ${conditionType}`);
  }
};

export const AutomationConditionsStep = <T extends AutomationRuleFormInputs>({
  form,
  projectBuildNames,
}: {
  form: ReturnType<typeof useFormContext<T>>;
  projectBuildNames: string[];
}) => {
  const conditionsField = "conditions" as Path<T>;
  const selectedConditions: T["conditions"] = form.watch(conditionsField);
  const unselectedConditions = CONDITIONS.filter(
    (c) => !Object.keys(selectedConditions).includes(c.type),
  );

  function onRemoveCondition(conditionType: AutomationConditionType) {
    const newConditions = { ...selectedConditions };
    delete newConditions[conditionType];
    form.setValue(
      conditionsField,
      newConditions as unknown as PathValue<T, Path<T>>,
    );
  }

  function onSelectionChange(key: Key) {
    form.setValue(conditionsField, {
      ...selectedConditions,
      [key as AutomationConditionType]: "",
    } as PathValue<T, Path<T>>);
  }

  return (
    <div>
      <StepTitle>
        <ActionBadge>If</ActionBadge> the following conditions are all met
      </StepTitle>

      <div className="flex flex-col gap-2">
        {Object.keys(selectedConditions).map((conditionType) => (
          <RemovableTask
            key={conditionType}
            onRemove={() =>
              onRemoveCondition(conditionType as AutomationConditionType)
            }
          >
            <ConditionDetail
              conditionType={conditionType as AutomationConditionType}
              projectBuildNames={projectBuildNames}
            />
          </RemovableTask>
        ))}

        <Select
          aria-label="Condition Types"
          onSelectionChange={onSelectionChange}
          isDisabled={unselectedConditions.length === 0}
        >
          <SelectButton className="w-full">
            Add optional condition...
          </SelectButton>
          <Popover>
            <ListBox>
              {unselectedConditions.map((c) => (
                <ListBoxItem key={c.type} id={c.type}>
                  {c.label}...
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
};
