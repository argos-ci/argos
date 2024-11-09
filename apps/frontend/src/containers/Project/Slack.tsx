import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";

import { LinkButton } from "../../ui/Button";
import { FormTextInput } from "../../ui/FormTextInput";
import { Link } from "../../ui/Link";

const UpdateProjectSlackMutation = graphql(`
  mutation ProjectSlack_updateProject($id: ID!, $slackChannelId: String) {
    updateProject(input: { id: $id, slackChannelId: $slackChannelId }) {
      id
      slackChannelId
    }
  }
`);

type Inputs = {
  slackChannelId: string;
};

const ProjectFragment = graphql(`
  fragment ProjectSlack_Project on Project {
    id
    slackChannelId
  }
`);

const SectionTitle = () => <CardTitle>Slack</CardTitle>;

export const ProjectSlack = (props: {
  project: FragmentType<typeof ProjectFragment>;
  slackTeamName: string | null;
}) => {
  const { accountSlug } = useParams();
  const project = useFragment(ProjectFragment, props.project);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      slackChannelId: project.slackChannelId ?? "",
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectSlackMutation,
      variables: {
        id: project.id,
        slackChannelId: data.slackChannelId,
      },
    });
  };

  return (
    <Card>
      {props.slackTeamName ? (
        <FormProvider {...form}>
          <Form onSubmit={onSubmit}>
            <CardBody>
              <SectionTitle />
              <CardParagraph>
                Setup Slack to get Argos build notifications on{" "}
                <span className="font-semibold">{props.slackTeamName}</span>{" "}
                workspace.
              </CardParagraph>
              <CardParagraph>
                <FormTextInput
                  {...form.register("slackChannelId", {
                    maxLength: {
                      value: 40,
                      message: "Name must be 40 characters or less",
                    },
                  })}
                  label="Slack channel ID"
                  placeholder="e.g., D052T9J702K"
                />{" "}
              </CardParagraph>
              <div className="text-low mt-2 text-sm">
                The Argos bot can only post in public channels. To enable
                posting in a private channel, just invite the Argos bot to it on
                Slack.
              </div>
            </CardBody>
            <FormCardFooter>
              You can update the connected Slack workspace in{" "}
              <Link href={`/${accountSlug}/settings`}>Team Settings</Link>.
            </FormCardFooter>
          </Form>
        </FormProvider>
      ) : (
        <>
          <CardBody>
            <SectionTitle />
            <CardParagraph>
              Setup Slack to get Argos notifications on your workspace. Connect
              your workspace on Team Settings to get started.
            </CardParagraph>
          </CardBody>
          <CardFooter className="flex items-center justify-end">
            <LinkButton href={`/${accountSlug}/settings`}>
              Team Settings
            </LinkButton>
          </CardFooter>
        </>
      )}
    </Card>
  );
};
