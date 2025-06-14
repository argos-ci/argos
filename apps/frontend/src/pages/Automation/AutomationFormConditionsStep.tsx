import { useId } from "react";
import { assertNever } from "@argos/util/assertNever";
import { FieldError } from "react-aria-components";
import { useController } from "react-hook-form";

import { AutomationConditionType, BuildStatus, BuildType } from "@/gql/graphql";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
import { buildStatusDescriptors, buildTypeDescriptors } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import { ActionBadge, RemovableTask, StepTitle } from "./AutomationForm";
import {
  BuildConclusionConditionSchema,
  BuildTypeConditionSchema,
  type AutomationForm,
} from "./types";

function BuildConclusionCondition(props: {
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { form, name } = props;
  const id = useId();
  const controller = useController({
    control: form.control,
    name,
  });
  const value = BuildConclusionConditionSchema.shape.value.parse(
    controller.field.value,
  );

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build conclusion is</label>

      <Select
        ref={controller.field.ref}
        aria-label="Build Conclusion"
        id={id}
        name={controller.field.name}
        selectedKey={value}
        onSelectionChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
        isInvalid={controller.fieldState.invalid}
      >
        <SelectButton className="text-sm">
          {value
            ? buildStatusDescriptors[value].label
            : "Select build conclusion…"}
        </SelectButton>
        <FieldError className="text-danger-low inline-flex text-sm">
          {controller.fieldState.error?.message}
        </FieldError>
        <Popover>
          <ListBox>
            {(
              [BuildStatus.NoChanges, BuildStatus.ChangesDetected] as const
            ).map((status) => {
              const descriptor = buildStatusDescriptors[status];
              const Icon = descriptor.icon;
              return (
                <ListBoxItem
                  key={status}
                  id={status}
                  textValue={descriptor.label}
                  className="text-sm"
                >
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
    </div>
  );
}

function BuildNameCondition(props: {
  projectBuildNames: string[];
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { projectBuildNames, form, name } = props;
  const id = useId();
  const controller = useController({ control: form.control, name });
  const value = controller.field.value;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build name is</label>
      <Select
        ref={controller.field.ref}
        aria-label="Build Name"
        id={id}
        name={controller.field.name}
        selectedKey={value}
        onSelectionChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
        isInvalid={controller.fieldState.invalid}
        className="flex items-center gap-2"
      >
        <SelectButton className="text-sm">
          {value || "Select build name…"}
        </SelectButton>
        <FieldError className="text-danger-low inline-flex text-sm">
          {controller.fieldState.error?.message}
        </FieldError>
        <Popover>
          <ListBox>
            {projectBuildNames.map((name) => (
              <ListBoxItem
                key={name}
                id={name}
                textValue={name}
                className="text-sm"
              >
                {name}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      </Select>
    </div>
  );
}

function BuildTypeCondition(props: {
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { form, name } = props;
  const id = useId();
  const controller = useController({ control: form.control, name });
  const value = BuildTypeConditionSchema.shape.value.parse(
    controller.field.value,
  );

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build type is</label>
      <Select
        ref={controller.field.ref}
        aria-label="Build Type"
        id={id}
        name={controller.field.name}
        selectedKey={value}
        onSelectionChange={controller.field.onChange}
        onBlur={controller.field.onBlur}
        isDisabled={controller.field.disabled}
        isInvalid={controller.fieldState.invalid}
      >
        <SelectButton className="text-sm">
          {value ? buildTypeDescriptors[value].label : "Select build type…"}
        </SelectButton>
        <FieldError className="text-danger-low inline-flex text-sm">
          {controller.fieldState.error?.message}
        </FieldError>
        <Popover>
          <ListBox>
            {Object.values(BuildType).map((type) => {
              const descriptor = buildTypeDescriptors[type];
              const Icon = descriptor.icon;
              return (
                <ListBoxItem
                  key={type}
                  id={type}
                  textValue={descriptor.label}
                  className="text-sm"
                >
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
    </div>
  );
}

function ConditionDetail(props: {
  projectBuildNames: string[];
  form: AutomationForm;
  name: `conditions.${number}`;
}) {
  const { projectBuildNames, form, name } = props;
  const condition = form.watch(name);
  switch (condition.type) {
    case AutomationConditionType.BuildConclusion:
      return <BuildConclusionCondition form={form} name={`${name}.value`} />;

    case AutomationConditionType.BuildName:
      return (
        <BuildNameCondition
          projectBuildNames={projectBuildNames}
          form={form}
          name={`${name}.value`}
        />
      );

    case AutomationConditionType.BuildType:
      return <BuildTypeCondition form={form} name={`${name}.value`} />;

    default:
      assertNever(condition, `Unknown condition type: ${condition}`);
  }
}

export function AutomationConditionsStep(props: {
  form: AutomationForm;
  projectBuildNames: string[];
}) {
  const { form, projectBuildNames } = props;
  const name = "conditions";
  const selectedConditions = form.watch(name);
  const selectedConditionsSet = new Set(selectedConditions.map((c) => c.type));
  const unselectedConditions = [
    {
      type: AutomationConditionType.BuildConclusion,
      label: "Build conclusion is…",
    },
    { type: AutomationConditionType.BuildType, label: "Build type is…" },
    projectBuildNames.length > 0
      ? { type: AutomationConditionType.BuildName, label: "Build name is…" }
      : null,
  ]
    .filter((condition) => condition !== null)
    .filter((condition) => !selectedConditionsSet.has(condition.type));

  function removeCondition(type: AutomationConditionType) {
    form.setValue(
      name,
      selectedConditions.filter((c) => c.type !== type),
    );
  }

  function addCondition(type: AutomationConditionType) {
    switch (type) {
      case AutomationConditionType.BuildConclusion: {
        form.setValue(name, [...selectedConditions, { type, value: null }]);
        return;
      }
      case AutomationConditionType.BuildName: {
        form.setValue(name, [...selectedConditions, { type, value: "" }]);
        return;
      }
      case AutomationConditionType.BuildType: {
        form.setValue(name, [...selectedConditions, { type, value: null }]);
        return;
      }
      default:
        assertNever(type, `Unknown condition type: ${type}`);
    }
  }

  return (
    <div>
      <StepTitle>
        <ActionBadge>If</ActionBadge> the following conditions are all met
      </StepTitle>

      <div className="flex flex-col gap-2">
        {selectedConditions.map((condition, index) => (
          <RemovableTask
            key={condition.type}
            onRemove={() => removeCondition(condition.type)}
          >
            <ConditionDetail
              projectBuildNames={projectBuildNames}
              form={form}
              name={`${name}.${index}`}
            />
          </RemovableTask>
        ))}

        <Select
          aria-label="Condition Types"
          onSelectionChange={(key) => {
            addCondition(key as AutomationConditionType);
          }}
          selectedKey={null}
          isDisabled={unselectedConditions.length === 0}
        >
          <SelectButton className="w-full">
            Add optional condition…
          </SelectButton>
          <Popover>
            <ListBox>
              {unselectedConditions.map((condition) => (
                <ListBoxItem
                  key={condition.type}
                  id={condition.type}
                  textValue={condition.label}
                >
                  {condition.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
      </div>
    </div>
  );
}
