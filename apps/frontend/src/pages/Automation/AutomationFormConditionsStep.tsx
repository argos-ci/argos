import { assertNever } from "@argos/util/assertNever";
import { Key } from "react-aria";
import { Controller, useController } from "react-hook-form";

import { AutomationConditionType, BuildStatus, BuildType } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { buildTypeDescriptors } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import { ActionBadge, RemovableTask, StepTitle } from "./AutomationForm";
import type { AutomationForm } from "./types";

type Condition = { type: AutomationConditionType; label: string };

const CONDITIONS = [
  {
    type: AutomationConditionType.BuildConclusion,
    label: "Build conclusion is",
  },
  { type: AutomationConditionType.BuildType, label: "Build type is" },
  { type: AutomationConditionType.BuildName, label: "Build name is" },
] satisfies Condition[];

function BuildConclusionCondition(props: { form: AutomationForm }) {
  const { form } = props;
  const name = `conditions.${AutomationConditionType.BuildConclusion}`;

  const toReadableConclusion = (conclusion: string | null) => {
    return conclusion ? conclusion.toLowerCase().replace(/_/g, " ") : "";
  };

  const controller = useController({
    control: form.control,
    name,
  });

  return (
    <div className="flex items-center gap-2">
      <div>Build conclusion is</div>

      <Select
        ref={controller.field.ref}
        aria-label="Build Conclusion"
        name={controller.field.name}
        selectedKey={controller.field.value}
        onSelectionChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
      >
        <SelectButton className="text-sm">
          {toReadableConclusion(controller.field.value) ||
            "Select build conclusion…"}
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
    </div>
  );
}

function BuildNameCondition(props: {
  projectBuildNames: string[];
  form: AutomationForm;
}) {
  const { projectBuildNames, form } = props;
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
              {field.value || "Select build name…"}
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
}

function BuildTypeCondition(props: { form: AutomationForm }) {
  const { form } = props;
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
              {field.value || "Select build type…"}
            </SelectButton>
            <Popover>
              <ListBox>
                {Object.values(BuildType).map((type) => {
                  const descriptor = buildTypeDescriptors[type];
                  const Icon = descriptor.icon;
                  return (
                    <ListBoxItem key={type} id={type} className="text-sm">
                      <MenuItemIcon>
                        <Icon
                          className={lowTextColorClassNames[descriptor.color]}
                        />
                      </MenuItemIcon>
                      {descriptor.label}
                    </ListBoxItem>
                  );
                })}
              </ListBox>
            </Popover>
          </Select>
        )}
      />
    </div>
  );
}

function ConditionDetail(props: {
  conditionType: AutomationConditionType;
  projectBuildNames: string[];
  form: AutomationForm;
}) {
  const { conditionType, projectBuildNames, form } = props;
  switch (conditionType) {
    case AutomationConditionType.BuildConclusion:
      return <BuildConclusionCondition form={form} />;

    case AutomationConditionType.BuildName:
      return (
        <BuildNameCondition form={form} projectBuildNames={projectBuildNames} />
      );

    case AutomationConditionType.BuildType:
      return <BuildTypeCondition form={form} />;

    default:
      assertNever(conditionType, `Unknown condition type: ${conditionType}`);
  }
}

export function AutomationConditionsStep(props: {
  form: AutomationForm;
  projectBuildNames: string[];
}) {
  const { form, projectBuildNames } = props;
  const name = "conditions";
  const selectedConditions = form.watch(name);
  const unselectedConditions = CONDITIONS.filter(
    (c) => !Object.keys(selectedConditions).includes(c.type),
  );

  function onRemoveCondition(conditionType: AutomationConditionType) {
    const newConditions = { ...selectedConditions };
    delete newConditions[conditionType];
    form.setValue(name, newConditions);
  }

  function onSelectionChange(key: Key) {
    form.setValue(name, {
      ...selectedConditions,
      [key as AutomationConditionType]: "",
    });
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
              form={form}
            />
          </RemovableTask>
        ))}

        <Select
          aria-label="Condition Types"
          onSelectionChange={onSelectionChange}
          isDisabled={unselectedConditions.length === 0}
        >
          <SelectButton className="w-full">
            Add optional condition…
          </SelectButton>
          <Popover>
            <ListBox>
              {unselectedConditions.map((c) => (
                <ListBoxItem key={c.type} id={c.type}>
                  {c.label}…
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
}
