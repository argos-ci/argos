import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  Control,
  SubmitHandler,
  useController,
  useForm,
} from "react-hook-form";

import {
  ProjectContributorLevelLabel,
  ProjectContributorLevelListBox,
} from "@/containers/ProjectContributor";
import { DocumentType, graphql } from "@/gql";
import { ProjectUserLevel } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";

const _ProjectFragment = graphql(`
  fragment ProjectDefaultUserLevel_Project on Project {
    id
    defaultUserLevel
  }
`);

function ProjectDefaultUserLevelField(props: { control: Control<Inputs> }) {
  const controller = useController({
    name: "level",
    control: props.control,
  });

  return (
    <Select
      aria-label="Levels"
      name={controller.field.name}
      selectedKey={controller.field.value}
      onBlur={controller.field.onBlur}
      onSelectionChange={(value) => {
        invariant(typeof value === "string");
        controller.field.onChange(value as ProjectUserLevel);
      }}
    >
      <SelectButton
        className={clsx(
          "w-full text-sm",
          controller.field.value === "none" && "text-low",
        )}
      >
        {controller.field.value === "none"
          ? "No default level"
          : ProjectContributorLevelLabel[controller.field.value]}
      </SelectButton>

      <Popover>
        <ProjectContributorLevelListBox clearable />
      </Popover>
    </Select>
  );
}

const UpdateProjectMutation = graphql(`
  mutation ProjectDefaultUserLevel_updateProject(
    $id: ID!
    $defaultUserLevel: ProjectUserLevel
  ) {
    updateProject(input: { id: $id, defaultUserLevel: $defaultUserLevel }) {
      id
      defaultUserLevel
    }
  }
`);

type Inputs = {
  level: ProjectUserLevel | "none";
};

function ProjectDefaultUserLevelDialog(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const form = useForm<Inputs>({
    defaultValues: {
      level: props.project.defaultUserLevel ?? "none",
    },
  });
  const client = useApolloClient();
  const { close } = useOverlayTriggerState();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectMutation,
      variables: {
        id: props.project.id,
        defaultUserLevel: data.level === "none" ? null : data.level,
      },
    });
    close();
  };
  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit}>
        <DialogBody>
          <DialogTitle>Set default contributor level</DialogTitle>
          <DialogText>
            Set the default access level for team contributors on this project.
            Team members with the “contributor” role will inherit this access
            level unless a specific access level is assigned to them for this
            project.
          </DialogText>
          <ProjectDefaultUserLevelField control={form.control} />
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Close</DialogDismiss>
          <FormSubmit control={form.control} disableIfPristine>
            Save
          </FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

export function ProjectDefaultUserLevel(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  return (
    <DialogTrigger>
      <Button variant="secondary">
        {project.defaultUserLevel
          ? "Change default contributor level"
          : "Set default contributor level"}
      </Button>
      <Modal>
        <ProjectDefaultUserLevelDialog project={project} />
      </Modal>
    </DialogTrigger>
  );
}
