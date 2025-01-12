import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { config } from "@/config";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";

const _AccountFragment = graphql(`
  fragment AccountGitLab_Account on Account {
    id
    permissions
    gitlabAccessToken
    gitlabBaseUrl
  }
`);

const UpdateAccountMutation = graphql(`
  mutation AccountGitLab_updateAccount($id: ID!, $gitlabAccessToken: String) {
    updateAccount(input: { id: $id, gitlabAccessToken: $gitlabAccessToken }) {
      id
      gitlabAccessToken
    }
  }
`);

type Inputs = {
  gitlabAccessToken: string;
  gitlabBaseUrl: string;
};

export const AccountGitLab = (props: {
  account: DocumentType<typeof _AccountFragment>;
}) => {
  const { account } = props;
  const client = useApolloClient();
  const userIsAdmin = account.permissions.includes(AccountPermission.Admin);
  const form = useForm<Inputs>({
    disabled: !userIsAdmin,
    defaultValues: {
      gitlabAccessToken: account.gitlabAccessToken ?? "",
      gitlabBaseUrl: account.gitlabBaseUrl ?? "",
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: UpdateAccountMutation,
      variables: {
        id: account.id,
        gitlabAccessToken: data.gitlabAccessToken || null,
      },
    });
    form.reset(data);
  };
  return (
    <Card>
      <FormProvider {...form}>
        <Form onSubmit={onSubmit}>
          <CardBody>
            <CardTitle id="gitlab">GitLab</CardTitle>
            <CardParagraph>
              Setup GitLab to get Argos updates in your merge requests.
            </CardParagraph>
            <FormTextInput
              {...form.register("gitlabAccessToken", {
                validate: (value) => {
                  if (value && !/^(glpat-)?[a-zA-Z0-9_-]{20,}$/.test(value)) {
                    return "Invalid GitLab personal access token, please be sure to enter a valid one ([a-zA-Z0-9_-]{20,}).";
                  }
                  return true;
                },
              })}
              label="Personal access token"
              disabled={!userIsAdmin}
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
            />
            <div className="text-low mt-2 text-sm">
              The access token is used to update commit status in GitLab. These
              updates are made on behalf of the user who created the access
              token. It must have access to the repository you want to integrate
              with.
            </div>
            {account.gitlabBaseUrl && (
              <div>
                <h3 className="mb-2 mt-4 font-semibold">
                  On-premise configuration
                </h3>
                <FormTextInput
                  {...form.register("gitlabBaseUrl")}
                  label="GitLab proxy URL"
                  readOnly
                />
                <div className="text-low mt-2 text-sm">
                  Proxy URL used to connect to your GitLab on-premise instance.
                  If you have any issue with your GitLab on-premise
                  configuration, please contact us{" "}
                  <Link href={`mailto:${config.contactEmail}`} target="_blank">
                    by email
                  </Link>
                  .
                </div>
              </div>
            )}
            {!userIsAdmin && (
              <div className="mt-4">
                If you want to setup GitLab integration, please ask your team
                owner to setup it.
              </div>
            )}
          </CardBody>
          <FormCardFooter>
            Learn more about{" "}
            <Link href="https://argos-ci.com/docs/gitlab" target="_blank">
              setting up GitLab + Argos integration
            </Link>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
