import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { Anchor } from "@/ui/Link";
import { SummaryCheck } from "@/gql/graphql";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";

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

const ProjectFragment = graphql(`
  fragment ProjectStatusChecks_Project on Project {
    id
    summaryCheck
  }
`);

export const ProjectStatusChecks = (props: {
  project: FragmentType<typeof ProjectFragment>;
}) => {
  const project = useFragment(ProjectFragment, props.project);
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
  };

  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Summary checks</CardTitle>
            <CardParagraph>
              A summary check is an additional check that represents the status
              of all checks for a given commit. It is useful to quickly see if a
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
                    <p className="text-sm font-normal text-low">
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
                    <p className="text-sm font-normal text-low">
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
                    <p className="text-sm font-normal text-low">
                      If you want to disable summary checks.
                    </p>
                  </div>
                }
              />
            </FormRadioGroup>
          </CardBody>
          <FormCardFooter>
            Learn more about{" "}
            <Anchor href="https://argos-ci.com/docs/summary-checks" external>
              summary checks
            </Anchor>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
