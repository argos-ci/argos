import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

const UpdateAutoIgnoreMutation = graphql(`
  mutation ProjectAutoIgnore_updateProject(
    $id: ID!
    $autoIgnore: AutoIgnoreSettingsInput
  ) {
    updateProject(input: { id: $id, autoIgnore: $autoIgnore }) {
      id
      autoIgnore {
        changes
      }
    }
  }
`);

type Inputs = {
  enabled: boolean;
  changes: string;
};

const _ProjectFragment = graphql(`
  fragment ProjectAutoIgnore_Project on Project {
    id
    autoIgnore {
      changes
    }
  }
`);

const DEFAULT_CHANGES = "3";

export const ProjectAutoIgnore = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const { project } = props;

  const form = useForm<Inputs>({
    defaultValues: {
      enabled: Boolean(project.autoIgnore),
      changes: project.autoIgnore?.changes.toString() ?? DEFAULT_CHANGES,
    },
  });

  const client = useApolloClient();
  const enabled = form.watch("enabled");

  const changesFieldProps = form.register("changes", {
    required: enabled
      ? { value: true, message: "Number of changes required" }
      : false,
    validate: (value) => {
      if (!enabled) {
        return true;
      }
      const changes = Number(value);
      if (!Number.isInteger(changes) || changes <= 0) {
        return "Use a positive integer";
      }
      return true;
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAutoIgnoreMutation,
      variables: {
        id: project.id,
        autoIgnore: data.enabled ? { changes: Number(data.changes) } : null,
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Automatically ignore flaky changes</CardTitle>
          <CardParagraph>
            Argos helps you to reduce noise by automatically ignoring recurring
            changes across multiple builds.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="enabled"
            label="Auto-ignore flaky changes"
          />
          {enabled && (
            <FormTextInput
              control={form.control}
              {...changesFieldProps}
              label="Minimum occurrences to consider a change flaky (last 7 days)"
              className="mt-4"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              description="A change is considered flaky if it appears at least this many times in auto-approved builds within 7 days."
            />
          )}
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link external href="https://argos-ci.com/docs/flaky-test-detection">
            Flaky test detection
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
};
