import { useApolloClient } from "@apollo/client/react";
import { SLUG_REGEX } from "@argos/util/slug";
import { SubmitHandler, useForm } from "react-hook-form";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const INTERNAL_DOMAIN_SUFFIX = config.deployments.baseDomain;

const _ProjectFragment = graphql(`
  fragment ProjectDomain_Project on Project {
    id
    domain
  }
`);

const UpdateProjectDomainMutation = graphql(`
  mutation ProjectDomain_updateProjectDomain(
    $input: UpdateProjectDomainInput!
  ) {
    updateProjectDomain(input: $input) {
      id
      domain
    }
  }
`);

type Inputs = {
  slug: string;
};

function getDomainSlug(domain: string | null | undefined) {
  if (!domain) {
    return "";
  }

  const suffix = `.${INTERNAL_DOMAIN_SUFFIX}`;
  if (!domain.endsWith(suffix)) {
    return domain;
  }

  return domain.slice(0, -suffix.length);
}

export const ProjectDomain = (props: {
  project: DocumentType<typeof _ProjectFragment>;
}) => {
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      slug: getDomainSlug(props.project.domain),
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const domain = `${data.slug}.${INTERNAL_DOMAIN_SUFFIX}`;

    const result = await client.mutate({
      mutation: UpdateProjectDomainMutation,
      variables: {
        input: {
          projectId: props.project.id,
          domain,
        },
      },
    });

    form.reset({
      slug: getDomainSlug(result.data?.updateProjectDomain.domain),
    });
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Deployments</CardTitle>
          <CardParagraph>
            Choose the internal domain used to serve your production deployment.
          </CardParagraph>
          <FormTextInput
            control={form.control}
            {...form.register("slug", {
              required: "Please enter a domain slug",
              maxLength: {
                value: 48,
                message: "Domain slugs must be 48 characters or less",
              },
              pattern: {
                value: SLUG_REGEX,
                message:
                  "Domain slugs must be lowercase, start and end with an alphanumeric character, and may contain dashes in the middle.",
              },
            })}
            label="Production domain"
            hiddenLabel
            addon={`.${INTERNAL_DOMAIN_SUFFIX}`}
            className="max-w-md"
          />
        </CardBody>
        <FormCardFooter control={form.control} />
      </Form>
    </Card>
  );
};
