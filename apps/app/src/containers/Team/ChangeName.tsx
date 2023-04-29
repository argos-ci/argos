import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const TeamFragment = graphql(`
  fragment TeamChangeName_Team on Team {
    id
    name
    slug
  }
`);

const UpdateAccountMutation = graphql(`
  mutation TeamChangeName_updateAccount($id: ID!, $name: String!) {
    updateAccount(input: { id: $id, name: $name }) {
      id
      name
    }
  }
`);

type Inputs = {
  name: string;
};

export type TeamChangeNameProps = {
  team: FragmentType<typeof TeamFragment>;
};

export const TeamChangeName = (props: TeamChangeNameProps) => {
  const team = useFragment(TeamFragment, props.team);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      name: team.name || team.slug,
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: team.id,
        name: data.name,
      },
    });
  };
  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle>Team Name</CardTitle>
            <CardParagraph>
              This is your team's visible name within Argos. For example, the
              name of your company or department.
            </CardParagraph>
            <FormTextInput
              {...form.register("name", {
                required: "Please enter a team name",
                maxLength: {
                  value: 40,
                  message: "Team name must be 40 characters or less",
                },
              })}
              label="Team name"
              hiddenLabel
            />
          </CardBody>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
};
