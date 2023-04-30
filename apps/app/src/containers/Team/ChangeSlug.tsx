import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const TeamFragment = graphql(`
  fragment TeamChangeSlug_Team on Team {
    id
    slug
  }
`);

const UpdateAccountMutation = graphql(`
  mutation TeamChangeSlug_updateAccount($id: ID!, $slug: String!) {
    updateAccount(input: { id: $id, slug: $slug }) {
      id
      slug
    }
  }
`);

type Inputs = {
  slug: string;
};

export type TeamChangeSlugProps = {
  team: FragmentType<typeof TeamFragment>;
};

export const TeamChangeSlug = (props: TeamChangeSlugProps) => {
  const team = useFragment(TeamFragment, props.team);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      slug: team.slug,
    },
  });
  const navigate = useNavigate();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: team.id,
        slug: data.slug,
      },
    });
    navigate(`/${data.slug}/settings`, { replace: true });
  };
  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Team URL</CardTitle>
            <CardParagraph>
              This is your team’s URL namespace on Argos. Within it, your team
              can inspect their projects or configure settings.
            </CardParagraph>
            <FormTextInput
              {...form.register("slug", {
                required: "Please enter a team slugs",
                maxLength: {
                  value: 48,
                  message: "Team slugs must be 48 characters or less",
                },
                pattern: {
                  value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message:
                    "Team slugs must be lowercase, begin with an alphanumeric character followed by more alphanumeric characters or dashes and ending with an alphanumeric character.",
                },
              })}
              label="Team slug"
              hiddenLabel
            />
          </CardBody>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
};
