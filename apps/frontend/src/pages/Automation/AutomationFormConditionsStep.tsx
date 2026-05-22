import { useEffect, useId, useMemo } from "react";
import type { AutomationInputCondition } from "@argos/schemas/automation-condition";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { GitPullRequestIcon, TowerControlIcon } from "lucide-react";
import { Text } from "react-aria-components";
import { useFieldArray } from "react-hook-form";

import { BuildMode, BuildStatus, BuildType } from "@/gql/graphql";
import { FieldError } from "@/ui/FieldError";
import { FormTextInput } from "@/ui/FormTextInput";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { MenuItemIcon } from "@/ui/Menu";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton, SelectField, SelectValue } from "@/ui/Select";
import {
  checkIsGlobCondition,
  checkIsNotCondition,
  getBuildCondition,
} from "@/util/automation";
import { buildStatusDescriptors, buildTypeDescriptors } from "@/util/build";
import { lowTextColorClassNames } from "@/util/colors";

import {
  ActionBadge,
  RemoveButton,
  StepTitle,
  Task,
  type AutomationForm,
} from "./AutomationForm";

type ConditionValueName =
  | `conditions.${number}.value`
  | `conditions.${number}.glob.value`
  | `conditions.${number}.not.value`
  | `conditions.${number}.not.glob.value`;

function BuildConclusionCondition(props: {
  form: AutomationForm;
  name: ConditionValueName;
}) {
  const { form, name } = props;
  const id = useId();
  const conclusions = [
    { status: BuildStatus.NoChanges, value: "no-changes" },
    { status: BuildStatus.ChangesDetected, value: "changes-detected" },
  ];

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build conclusion</label>
      <OperatorSelector form={form} name={name} />
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

function BuildBranchCondition(props: {
  form: AutomationForm;
  conditionName: `conditions.${number}`;
  name: ConditionValueName;
}) {
  const { form, conditionName, name } = props;
  const branchOperator = getBranchOperator(form.watch(conditionName));
  const placeholder =
    branchOperator === "glob" || branchOperator === "not-glob"
      ? "release/*"
      : "main";

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span>Branch</span>
      <BranchOperatorSelector form={form} name={conditionName} />
      <FormTextInput
        control={form.control}
        {...form.register(name)}
        hiddenLabel
        label="Branch"
        placeholder={placeholder}
        scale="sm"
        className="min-w-0 flex-1"
        orientation="horizontal"
      />
    </div>
  );
}

function BuildNameCondition(props: {
  projectBuildNames: string[];
  form: AutomationForm;
  name: ConditionValueName;
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
      <label htmlFor={id}>Build name</label>
      <OperatorSelector form={form} name={name} />
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

const buildModeOptions = [
  {
    mode: BuildMode.Ci,
    label: "CI",
    icon: GitPullRequestIcon,
  },
  {
    mode: BuildMode.Monitoring,
    label: "Monitoring",
    icon: TowerControlIcon,
  },
];

function BuildModeCondition(props: {
  form: AutomationForm;
  conditionName: `conditions.${number}`;
  name: ConditionValueName;
}) {
  const { form, conditionName, name } = props;
  const id = useId();
  const condition = form.watch(conditionName);

  useEffect(() => {
    if (!checkIsNotCondition(condition)) {
      return;
    }
    const buildCondition = getBuildCondition(condition);
    invariant(buildCondition.type === "build-mode");
    form.setValue(conditionName, {
      type: "build-mode",
      value:
        buildCondition.value === BuildMode.Ci
          ? BuildMode.Monitoring
          : buildCondition.value === BuildMode.Monitoring
            ? BuildMode.Ci
            : null,
    });
  }, [condition, conditionName, form]);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build mode</label>
      <span>is</span>
      <SelectField
        id={id}
        control={form.control}
        aria-label="Build Mode"
        orientation="horizontal"
        name={name}
        placeholder="Select build mode…"
      >
        <SelectButton className="text-sm">
          <SelectValue />
        </SelectButton>
        <FieldError />
        <Popover>
          <ListBox>
            {buildModeOptions.map(({ mode, label, icon: Icon }) => (
              <ListBoxItem
                key={mode}
                id={mode}
                textValue={label}
                className="text-sm"
              >
                <MenuItemIcon>
                  <Icon />
                </MenuItemIcon>
                <Text slot="label">{label}</Text>
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
  name: ConditionValueName;
}) {
  const { form, name } = props;
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id}>Build type</label>
      <OperatorSelector form={form} name={name} />
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
  const value = form.watch(name);
  const condition = getBuildCondition(value);
  const valueName = getConditionValueName(value, name);

  switch (condition.type) {
    case "build-branch":
      return (
        <BuildBranchCondition
          conditionName={name}
          form={form}
          name={valueName}
        />
      );

    case "build-conclusion":
      return <BuildConclusionCondition form={form} name={valueName} />;

    case "build-mode":
      return (
        <BuildModeCondition conditionName={name} form={form} name={valueName} />
      );

    case "build-name":
      return (
        <BuildNameCondition
          projectBuildNames={projectBuildNames}
          form={form}
          name={valueName}
        />
      );

    case "build-type":
      return <BuildTypeCondition form={form} name={valueName} />;

    default:
      assertNever(condition, `Unknown condition type: ${condition}`);
  }
}

function getConditionValueName(
  condition: AutomationInputCondition,
  name: `conditions.${number}`,
): ConditionValueName {
  if (checkIsNotCondition(condition)) {
    return checkIsGlobCondition(condition.not)
      ? (`${name}.not.glob.value` as const)
      : (`${name}.not.value` as const);
  }
  return checkIsGlobCondition(condition)
    ? (`${name}.glob.value` as const)
    : (`${name}.value` as const);
}

function OperatorSelector(props: {
  form: AutomationForm;
  name: ConditionValueName;
  labels?: { eq: string; neq: string };
}) {
  const { name, form, labels = { eq: "is", neq: "is not" } } = props;
  const operator = name.endsWith(".not.value") ? "neq" : "eq";
  const conditionName = name.replace(
    /(\.not)?(\.glob)?\.value/,
    "",
  ) as `conditions.${number}`;
  return (
    <Select
      aria-label="Operator"
      value={operator}
      onChange={(value) => {
        const rawCondition = form.getValues(conditionName);
        const buildCondition = getBuildCondition(rawCondition);
        invariant(value === "eq" || value === "neq");
        switch (value) {
          case "eq": {
            form.setValue(conditionName, buildCondition);
            break;
          }
          case "neq": {
            form.setValue(conditionName, { not: buildCondition });
            break;
          }
          default:
            assertNever(value);
        }
      }}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <Popover>
        <ListBox>
          <ListBoxItem id="eq" textValue={labels.eq}>
            {labels.eq}
          </ListBoxItem>
          <ListBoxItem id="neq" textValue={labels.neq}>
            {labels.neq}
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}

type BranchOperator = "eq" | "neq" | "glob" | "not-glob";

function getBranchOperator(
  condition: AutomationInputCondition,
): BranchOperator {
  if (checkIsNotCondition(condition)) {
    return checkIsGlobCondition(condition.not) ? "not-glob" : "neq";
  }
  return checkIsGlobCondition(condition) ? "glob" : "eq";
}

function BranchOperatorSelector(props: {
  form: AutomationForm;
  name: `conditions.${number}`;
}) {
  const { form, name } = props;
  const condition = form.watch(name);
  const operator = getBranchOperator(condition);

  return (
    <Select
      aria-label="Operator"
      value={operator}
      onChange={(value) => {
        const rawCondition = form.getValues(name);
        const buildCondition = getBuildCondition(rawCondition);
        invariant(buildCondition.type === "build-branch");
        invariant(
          value === "eq" ||
            value === "neq" ||
            value === "glob" ||
            value === "not-glob",
        );
        switch (value) {
          case "eq": {
            form.setValue(name, buildCondition);
            break;
          }
          case "neq": {
            form.setValue(name, { not: buildCondition });
            break;
          }
          case "glob": {
            form.setValue(name, { glob: buildCondition });
            break;
          }
          case "not-glob": {
            form.setValue(name, { not: { glob: buildCondition } });
            break;
          }
          default:
            assertNever(value);
        }
      }}
    >
      <SelectButton>
        <SelectValue />
      </SelectButton>
      <Popover>
        <ListBox>
          <ListBoxItem id="eq" textValue="is">
            is
          </ListBoxItem>
          <ListBoxItem id="neq" textValue="is not">
            is not
          </ListBoxItem>
          <ListBoxItem id="glob" textValue="matches">
            matches
          </ListBoxItem>
          <ListBoxItem id="not-glob" textValue="does not match">
            does not match
          </ListBoxItem>
        </ListBox>
      </Popover>
    </Select>
  );
}

const CONDITIONS = [
  {
    type: "build-conclusion" as const,
    label: "Build conclusion",
  },
  { type: "build-type" as const, label: "Build type" },
  { type: "build-mode" as const, label: "Build mode" },
  { type: "build-name" as const, label: "Build name" },
  { type: "build-branch" as const, label: "Build branch" },
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
  const conditions = CONDITIONS.filter((condition) => {
    if (condition.type === "build-name" && projectBuildNames.length === 0) {
      return false; // Skip build name condition if no builds are available
    }
    return true;
  });

  return (
    <div>
      <StepTitle>
        <ActionBadge>If</ActionBadge> the following conditions are{" "}
        <strong>all</strong> met
      </StepTitle>

      <div className="flex flex-col gap-2">
        {fields.map((_condition, index) => (
          <Task key={index}>
            <ConditionDetail
              projectBuildNames={projectBuildNames}
              form={form}
              name={`${name}.${index}`}
            />
            <RemoveButton onPress={() => remove(index)} />
          </Task>
        ))}

        <SelectField
          control={form.control}
          name={name}
          aria-label="Condition Types"
          value={null}
          onChange={(key) => {
            switch (key) {
              case "build-conclusion":
              case "build-mode":
              case "build-type": {
                append({ type: key, value: null });
                return;
              }
              case "build-branch":
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
