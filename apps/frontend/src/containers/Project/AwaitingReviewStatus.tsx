import { useApolloClient } from "@apollo/client/react";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { AwaitingReviewStatus } from "@/gql/graphql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";

const UpdateAwaitingReviewStatusMutation = graphql(`
  mutation ProjectAwaitingReviewStatus_updateProject(
    $id: ID!
    $awaitingReviewStatus: AwaitingReviewStatus
  ) {
    updateProject(
      input: { id: $id, awaitingReviewStatus: $awaitingReviewStatus }
    ) {
      id
      awaitingReviewStatus
    }
  }
`);

type Inputs = {
  awaitingReviewStatus: AwaitingReviewStatus;
};

const _ProjectFragment = graphql(`
  fragment ProjectAwaitingReviewStatus_Project on Project {
    id
    awaitingReviewStatus
  }
`);

export function ProjectAwaitingReviewStatus(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const form = useForm<Inputs>({
    defaultValues: {
      awaitingReviewStatus: project.awaitingReviewStatus,
    },
  });

  const client = useApolloClient();

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAwaitingReviewStatusMutation,
      variables: {
        id: project.id,
        awaitingReviewStatus: data.awaitingReviewStatus,
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Status while awaiting review</CardTitle>
          <CardParagraph>
            The status Argos reports on the commit when a build has changes that
            need a review. Once the changes are approved, it turns to success;
            if they are rejected, to failure.
          </CardParagraph>
          <FormRadioGroup>
            <FormRadio
              {...form.register("awaitingReviewStatus")}
              value="failure"
              label={
                <div className="ml-2">
                  Report a failure
                  <p className="text-low text-sm font-normal">
                    Changes stand out on the pull request until someone reviews
                    them.
                  </p>
                </div>
              }
            />
            <FormRadio
              {...form.register("awaitingReviewStatus")}
              value="pending"
              label={
                <div className="ml-2">
                  Report a pending status
                  <p className="text-low text-sm font-normal">
                    The check waits for the review instead of failing, so
                    changes are not mistaken for a broken build. Shown as
                    running on GitLab.
                  </p>
                </div>
              }
            />
          </FormRadioGroup>
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
}
