import { FragmentType, graphql, useFragment } from "@/gql";
import { Link } from "@/ui/Link";

export function AccountLink(props: {
  name?: string | null | undefined;
  login: string;
  url: string;
}) {
  return (
    <Link href={props.url} target="_blank" className="!text">
      {props.name ? (
        <>
          {props.name} ({props.login})
        </>
      ) : (
        props.login
      )}
    </Link>
  );
}

const GithubAccountLinkFragment = graphql(`
  fragment GithubAccountLink_GithubAccount on GithubAccount {
    login
    name
    url
  }
`);

export function GithubAccountLink(props: {
  githubAccount: FragmentType<typeof GithubAccountLinkFragment>;
}) {
  const githubAccount = useFragment(
    GithubAccountLinkFragment,
    props.githubAccount,
  );

  return (
    <AccountLink
      login={githubAccount.login}
      name={githubAccount.name}
      url={githubAccount.url}
    />
  );
}
