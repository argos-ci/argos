import { FragmentType, graphql, useFragment } from "@/gql";
import { Link } from "@/ui/Link";

const GithubAccountLinkFragment = graphql(`
  fragment GithubAccountLink_GithubAccount on GithubAccount {
    login
    name
    url
  }
`);

export const GithubAccountLink = (props: {
  githubAccount: FragmentType<typeof GithubAccountLinkFragment>;
}) => {
  const githubAccount = useFragment(
    GithubAccountLinkFragment,
    props.githubAccount,
  );

  return (
    <Link href={githubAccount.url} target="_blank" className="!text">
      {githubAccount.name ? (
        <>
          {githubAccount.name} ({githubAccount.login})
        </>
      ) : (
        githubAccount.login
      )}
    </Link>
  );
};
