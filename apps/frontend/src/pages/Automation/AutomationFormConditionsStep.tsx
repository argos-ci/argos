import { useId, useMemo } from "react";
import { assertNever } from "@argos/util/assertNever";
import { Text } from "react-aria-components";
import { useFieldArray } from "react-hook-form";

import { BuildStatus, BuildType } from "@/gql/graphql";
import { FieldError } from "@/ui/FieldError";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { SelectButton, SelectField, SelectValue } from "@/ui/Select";
import { buildStatusDescriptors, buildTypeDescriptors } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import {
  ActionBadge,
  RemovableTask,
  StepTitle,
  type AutomationForm,
} from "./AutomationForm";

function BuildConclusionCondition(props: {
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { form, name } = props;
  const id = useId();
  const conclusions = [
    { status: BuildStatus.NoChanges, value: "no-changes" },
    { status: BuildStatus.ChangesDetected, value: "changes-detected" },
  ];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build conclusion is</label>
      <SelectField
        id={id}
        control={form.control}
        name={name}
        aria-label="Build Conclusion"
        orientation="horizontal"
        placeholder="Select build conclusion…"
      >
        <SelectButton className="text-sm">
          <SelectValue />
        </SelectButton>
        <FieldError />
        <Popover>
          <ListBox>
            {conclusions.map(({ status, value }) => {
              const descriptor = buildStatusDescriptors[status];
              const Icon = descriptor.icon;
              return (
                <ListBoxItem
                  key={value}
                  id={value}
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
      </SelectField>
    </div>
  );
}

function BuildNameCondition(props: {
  projectBuildNames: string[];
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { projectBuildNames, name, form } = props;
  const value = form.watch(name);
  const id = useId();
  // Add the actual build name value to the list, always.
  const buildNames = useMemo(() => {
    const buildNames = Array.from(projectBuildNames);
    if (value && !buildNames.includes(value)) {
      buildNames.unshift(value);
    }
    return buildNames;
  }, [value, projectBuildNames]);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build name is</label>
      <SelectField
        control={form.control}
        id={id}
        name={name}
        aria-label="Build Name"
        orientation="horizontal"
        placeholder="Select build name…"
      >
        <SelectButton className="text-sm">
          <SelectValue />
        </SelectButton>
        <FieldError />
        <Popover>
          <ListBox>
            {buildNames.map((name) => (
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
      </SelectField>
    </div>
  );
}

function BuildTypeCondition(props: {
  form: AutomationForm;
  name: `conditions.${number}.value`;
}) {
  const { form, name } = props;
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build type is</label>
      <SelectField
        id={id}
        control={form.control}
        aria-label="Build Type"
        orientation="horizontal"
        name={name}
        placeholder="Select build type…"
      >
        <SelectButton className="text-sm">
          <SelectValue />
        </SelectButton>
        <FieldError />
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
                  <Text slot="label">{descriptor.label}</Text>
                </ListBoxItem>
              );
            })}
          </ListBox>
        </Popover>
      </SelectField>
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
    case "build-conclusion":
      return <BuildConclusionCondition form={form} name={`${name}.value`} />;

    case "build-name":
      return (
        <BuildNameCondition
          projectBuildNames={projectBuildNames}
          form={form}
          name={`${name}.value`}
        />
      );

    case "build-type":
      return <BuildTypeCondition form={form} name={`${name}.value`} />;

    default:
      assertNever(condition, `Unknown condition type: ${condition}`);
  }
}

const CONDITIONS = [
  {
    type: "build-conclusion" as const,
    label: "Build conclusion is…",
  },
  { type: "build-type" as const, label: "Build type is…" },
  { type: "build-name" as const, label: "Build name is…" },
];

export function AutomationConditionsStep(props: {
  form: AutomationForm;
  projectBuildNames: string[];
}) {
  const { form, projectBuildNames } = props;
  const name = "conditions";
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });
  const selectedConditionTypes = new Set(fields.map((c) => c.type));
  const conditions = CONDITIONS.filter((condition) => {
    if (condition.type === "build-name" && projectBuildNames.length === 0) {
      return false; // Skip build name condition if no builds are available
    }
    return true;
  }).filter((condition) => !selectedConditionTypes.has(condition.type));

  return (
    <div>
      <StepTitle>
        <ActionBadge>If</ActionBadge> the following conditions are{" "}
        <strong>all</strong> met
      </StepTitle>

      <div className="flex flex-col gap-2">
        {fields.map((condition, index) => (
          <RemovableTask key={condition.type} onRemove={() => remove(index)}>
            <ConditionDetail
              projectBuildNames={projectBuildNames}
              form={form}
              name={`${name}.${index}`}
            />
          </RemovableTask>
        ))}

        <SelectField
          control={form.control}
          name={name}
          aria-label="Condition Types"
          value={null}
          onChange={(key) => {
            switch (key) {
              case "build-conclusion":
              case "build-type": {
                append({ type: key, value: null });
                return;
              }
              case "build-name": {
                append({ type: key, value: "" });
                return;
              }
              default:
                throw new Error(`Unknown condition type: ${key}`);
            }
          }}
          isDisabled={conditions.length === 0}
          placeholder="Add optional condition…"
        >
          <SelectButton className="w-full">
            <SelectValue />
          </SelectButton>
          <FieldError />
          <Popover>
            <ListBox>
              {conditions.map((condition) => (
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
        </SelectField>
      </div>
    </div>
  );
}
