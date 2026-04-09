import { useId } from "react";
import { useApolloClient } from "@apollo/client/react";
import { SLUG_REGEX } from "@argos/util/slug";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { DocumentType, graphql } from "@/gql";
import { getAccountURL } from "@/pages/Account/AccountParams";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const _AccountFragment = graphql(`
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

export const AccountChangeSlug = (props: {
  account: DocumentType<typeof _AccountFragment>;
  title: React.ReactNode;
  description: React.ReactNode;
}) => {
  const { account, title, description } = props;
  const headingId = useId();
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
    navigate(`${getAccountURL({ accountSlug: data.slug })}/settings`, {
      replace: true,
    });
  };
  return (
    <Card role="region" aria-labelledby={headingId}>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle id={headingId}>{title}</CardTitle>
          <CardParagraph>{description}</CardParagraph>
          <FormTextInput
            control={form.control}
            {...form.register("slug", {
              required: "Please enter a slug",
              maxLength: {
                value: 48,
                message: "Account slugs must be 48 characters or less",
              },
              pattern: {
                value: SLUG_REGEX,
                message:
                  "Account slugs must be lowercase, begin with an alphanumeric character followed by more alphanumeric characters or dashes and ending with an alphanumeric character.",
              },
            })}
            label="URL namespace"
            hiddenLabel
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
};
