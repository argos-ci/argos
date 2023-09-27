import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const AccountFragment = graphql(`
  fragment AccountChangeSlug_Account on Account {
    id
    slug
  }
`);

const UpdateAccountMutation = graphql(`
  mutation AccountChangeSlug_updateAccount($id: ID!, $slug: String!) {
    updateAccount(input: { id: $id, slug: $slug }) {
      id
      slug
    }
  }
`);

type Inputs = {
  slug: string;
};

export type AccountChangeSlugProps = {
  account: FragmentType<typeof AccountFragment>;
  title: React.ReactNode;
  description: React.ReactNode;
};

export const AccountChangeSlug = (props: AccountChangeSlugProps) => {
  const account = useFragment(AccountFragment, props.account);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      slug: account.slug,
    },
  });
  const navigate = useNavigate();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: account.id,
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
            <CardTitle>{props.title}</CardTitle>
            <CardParagraph>{props.description}</CardParagraph>
            <FormTextInput
              {...form.register("slug", {
                required: "Please enter a slug",
                maxLength: {
                  value: 48,
                  message: "Account slugs must be 48 characters or less",
                },
                pattern: {
                  value: /^[a-z0-9]+(?:[-a-z0-9]+)*$/,
                  message:
                    "Account slugs must be lowercase, begin with an alphanumeric character followed by more alphanumeric characters or dashes and ending with an alphanumeric character.",
                },
              })}
              label="URL namespace"
              hiddenLabel
            />
          </CardBody>
          <FormCardFooter />
        </Form>
      </FormProvider>
    </Card>
  );
};
