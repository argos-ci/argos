import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormSwitch } from "@/ui/FormSwitch";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

const DEFAULT_CHANGES = "3";

const _ProjectFragment = graphql(`
  fragment ProjectIgnore_Project on Project {
    id
    ignoreConfig {
      enabled
      autoIgnore {
        changes
      }
    }
  }
`);

const UpdateIgnoreConfigMutation = graphql(`
  mutation ProjectIgnore_updateProject(
    $id: ID!
    $ignoreConfig: IgnoreConfigInput
  ) {
    updateProject(input: { id: $id, ignoreConfig: $ignoreConfig }) {
      id
      ignoreConfig {
        enabled
        autoIgnore {
          changes
        }
      }
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;

export function ProjectIgnore(props: { project: Project }) {
  const { project } = props;
  return (
    <>
      <IgnoreFeatureCard project={project} />
      {project.ignoreConfig.enabled && <AutoIgnoreCard project={project} />}
    </>
  );
}

type FeatureInputs = {
  enabled: boolean;
};

function IgnoreFeatureCard(props: { project: Project }) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<FeatureInputs>({
    defaultValues: {
      enabled: project.ignoreConfig.enabled,
    },
  });

  const onSubmit: SubmitHandler<FeatureInputs> = async (data) => {
    await client.mutate({
      mutation: UpdateIgnoreConfigMutation,
      variables: {
        id: project.id,
        ignoreConfig: {
          enabled: data.enabled,
          // Preserve the auto-ignore configuration when toggling the feature.
          autoIgnore: project.ignoreConfig.autoIgnore
            ? { changes: project.ignoreConfig.autoIgnore.changes }
            : null,
        },
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Ignore changes</CardTitle>
          <CardParagraph>
            Let reviewers mark recurring or flaky changes as ignored so they no
            longer require review. When disabled, changes can no longer be
            ignored and previously ignored changes are treated as regular
            changes again.
          </CardParagraph>
          <FormSwitch
            control={form.control}
            name="enabled"
            label="Enable the ignore feature for this project"
          />
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link
            external
            href="https://argos-ci.com/docs/learn/reliability-and-flakiness/flaky-test-detection"
          >
            ignoring changes
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}

type AutoIgnoreInputs = {
  enabled: boolean;
  changes: string;
};

function AutoIgnoreCard(props: { project: Project }) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<AutoIgnoreInputs>({
    defaultValues: {
      enabled: Boolean(project.ignoreConfig.autoIgnore),
      changes:
        project.ignoreConfig.autoIgnore?.changes.toString() ?? DEFAULT_CHANGES,
    },
  });

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

  const onSubmit: SubmitHandler<AutoIgnoreInputs> = async (data) => {
    await client.mutate({
      mutation: UpdateIgnoreConfigMutation,
      variables: {
        id: project.id,
        ignoreConfig: {
          enabled: true,
          autoIgnore: data.enabled ? { changes: Number(data.changes) } : null,
        },
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
          <Link
            external
            href="https://argos-ci.com/docs/learn/reliability-and-flakiness/flaky-test-detection"
          >
            Flaky test detection
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}
