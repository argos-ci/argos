import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { SummaryCheck } from "@/gql/graphql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";
import { Link } from "@/ui/Link";

const UpdateStatusChecksMutation = graphql(`
  mutation ProjectStatusChecks_updateProject(
    $id: ID!
    $summaryCheck: SummaryCheck
  ) {
    updateProject(input: { id: $id, summaryCheck: $summaryCheck }) {
      id
      summaryCheck
    }
  }
`);

type Inputs = {
  summaryCheck: SummaryCheck;
};

const _ProjectFragment = graphql(`
  fragment ProjectStatusChecks_Project on Project {
    id
    summaryCheck
  }
`);

export const ProjectStatusChecks = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const { project } = props;
  const form = useForm<Inputs>({
    defaultValues: {
      summaryCheck: project.summaryCheck,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateStatusChecksMutation,
      variables: {
        id: project.id,
        summaryCheck: data.summaryCheck,
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Summary checks</CardTitle>
          <CardParagraph>
            A summary check is an additional check that represents the status of
            all checks for a given commit. It is useful to quickly see if a
            commit is passing or failing or to mark Argos as required for a
            merge.
          </CardParagraph>
          <FormRadioGroup>
            <FormRadio
              {...form.register("summaryCheck")}
              value="auto"
              label={
                <div className="ml-2">
                  Add a summary check only if there is more than one build
                  <p className="text-low text-sm font-normal">
                    Recommended for most projects.
                  </p>
                </div>
              }
            />
            <FormRadio
              {...form.register("summaryCheck")}
              value="always"
              label={
                <div className="ml-2">
                  Always add a summary check
                  <p className="text-low text-sm font-normal">
                    Useful if your project runs Argos builds conditionally.
                  </p>
                </div>
              }
            />
            <FormRadio
              {...form.register("summaryCheck")}
              value="never"
              label={
                <div className="ml-2">
                  Never add a summary check
                  <p className="text-low text-sm font-normal">
                    If you want to disable summary checks.
                  </p>
                </div>
              }
            />
          </FormRadioGroup>
        </CardBody>
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link href="https://argos-ci.com/docs/summary-checks" target="_blank">
            summary checks
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
};
