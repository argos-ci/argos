import { useApolloClient } from "@apollo/client";
import { SubmitHandler, useForm } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const _AccountFragment = graphql(`
  fragment AccountChangeName_Account on Account {
    id
    name
    slug
  }
`);

const UpdateAccountMutation = graphql(`
  mutation AccountChangeName_updateAccount($id: ID!, $name: String!) {
    updateAccount(input: { id: $id, name: $name }) {
      id
      name
    }
  }
`);

type Inputs = {
  name: string;
};

export const AccountChangeName = (props: {
  account: DocumentType<typeof _AccountFragment>;
  title: React.ReactNode;
  description: React.ReactNode;
}) => {
  const { account } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      name: account.name || account.slug,
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: account.id,
        name: data.name,
      },
    });
    form.reset(data);
  };
  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>{props.title}</CardTitle>
          <CardParagraph>{props.description}</CardParagraph>
          <FormTextInput
            control={form.control}
            {...form.register("name", {
              required: "Please enter a name",
              maxLength: {
                value: 40,
                message: "Name must be 40 characters or less",
              },
            })}
            label="Name"
            hiddenLabel
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
};
