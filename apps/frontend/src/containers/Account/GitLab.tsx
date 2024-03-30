import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import { Anchor } from "@/ui/Anchor";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";

const AccountFragment = graphql(`
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
  account: FragmentType<typeof AccountFragment>;
}) => {
  const account = useFragment(AccountFragment, props.account);
  const client = useApolloClient();
  const form = useForm<Inputs>({
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
  };
  const userIsAdmin = account.permissions.includes(AccountPermission.Admin);
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
                  <Anchor href={`mailto:${config.get("contactEmail")}`}>
                    by email
                  </Anchor>
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
          <FormCardFooter disabled={!userIsAdmin}>
            Learn more about{" "}
            <Anchor href="https://argos-ci.com/docs/gitlab" external>
              setting up GitLab + Argos integration
            </Anchor>
            .
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
