import { useApolloClient } from "@apollo/client/react";
import { SLUG_REGEX } from "@argos/util/slug";
import { SubmitHandler, useForm } from "react-hook-form";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

const INTERNAL_DOMAIN_SUFFIX = config.deployments.baseDomain;

const _ProjectFragment = graphql(`
  fragment ProductionDomain_Project on Project {
    id
    domain
  }
`);

const UpdateProjectDomainMutation = graphql(`
  mutation ProductionDomain_updateProjectDomain(
    $input: UpdateProjectDomainInput!
  ) {
    updateProjectDomain(input: $input) {
      id
      domain
    }
  }
`);

type Inputs = {
  domain: string;
};

export function ProductionDomain(props: {
  project: DocumentType<typeof _ProjectFragment>;
}) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      domain: getDomainSlug(project.domain),
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateProjectDomainMutation,
      variables: {
        input: {
          projectId: project.id,
          domain: `${data.domain}.${INTERNAL_DOMAIN_SUFFIX}`,
        },
      },
    });
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Production domain</CardTitle>
          <CardParagraph>
            Internal domain used to serve your production deployment.
          </CardParagraph>
          <FormTextInput
            control={form.control}
            {...form.register("domain", {
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
        <FormCardFooter control={form.control}>
          Learn more about{" "}
          <Link
            href="https://argos-ci.com/docs/deployments/urls"
            target="_blank"
          >
            deployment URLs and domains
          </Link>
          .
        </FormCardFooter>
      </Form>
    </Card>
  );
}

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
