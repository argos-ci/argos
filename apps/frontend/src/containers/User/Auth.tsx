import { invariant } from "@argos/util/invariant";

import { FragmentType, graphql, useFragment } from "@/gql";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";

import { GitHubAuth } from "./providers/GitHubAuth";
import { GitLabAuth } from "./providers/GitLabAuth";
import { GoogleAuth } from "./providers/GoogleAuth";

const AccountFragment = graphql(`
  fragment UserAuth_Account on Account {
    id
    ... on User {
      ...GitHubAuth_Account
      ...GitLabAuth_Account
      ...GoogleAuth_Account
    }
  }
`);

export function UserAuth(props: {
  account: FragmentType<typeof AccountFragment>;
}) {
  const account = useFragment(AccountFragment, props.account);
  invariant(account.__typename === "User");
  return (
    <Card>
      <CardBody>
        <CardTitle>Authentication</CardTitle>
        <CardParagraph>
          Connect your Argos Account with a third-party service to use it for
          login.
        </CardParagraph>
        <div className="flex flex-col gap-2">
          <GitHubAuth account={account} />
          <GitLabAuth account={account} />
          <GoogleAuth account={account} />
        </div>
      </CardBody>
    </Card>
  );
}