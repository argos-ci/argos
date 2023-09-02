import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormTextInput } from "@/ui/FormTextInput";
import { Permission } from "@/gql/graphql";
import { Anchor } from "@/ui/Link";

const AccountFragment = graphql(`
  fragment AccountGitLab_Account on Account {
    id
    permissions
    gitlabAccessToken
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
};

export type AccountGitLabProps = {
  account: FragmentType<typeof AccountFragment>;
};

export const AccountGitLab = (props: AccountGitLabProps) => {
  const account = useFragment(AccountFragment, props.account);
  const client = useApolloClient();
  const form = useForm<Inputs>({
    defaultValues: {
      gitlabAccessToken: account.gitlabAccessToken ?? "",
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
  const writable = account.permissions.includes(Permission.Write);
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
              {...form.register("gitlabAccessToken")}
              label="Personal access token"
              disabled={!writable}
            />
            <div className="text-sm text-low mt-2">
              The access token is used to update commit status in GitLab. These
              updates are made on behalf of the user who created the access
              token. It must have access to the repository you want to integrate
              with.
            </div>
            {!writable && (
              <div className="mt-4">
                If you want to setup GitLab integration, please ask your team
                owner to setup it.
              </div>
            )}
          </CardBody>
          <FormCardFooter>
            <div>
              Learn more about{" "}
              <Anchor href="https://argos-ci.com/docs/gitlab" external>
                setting up GitLab + Argos integration.
              </Anchor>
            </div>
          </FormCardFooter>
        </Form>
      </FormProvider>
    </Card>
  );
};
