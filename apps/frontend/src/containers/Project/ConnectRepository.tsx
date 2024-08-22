import * as React from "react";
import { useQuery } from "@apollo/client";
import { invariant } from "@apollo/client/utilities/globals";
import { assertNever } from "@argos/util/assertNever";
import { MarkGithubIcon } from "@primer/octicons-react";
import { useLocation } from "react-router-dom";
import { useDebounce } from "use-debounce";

import config from "@/config";
import { GithubInstallationsSelect } from "@/containers/GithubInstallationsSelect";
import { GithubRepositoryList } from "@/containers/GithubRepositoryList";
import { GitlabNamespacesSelect } from "@/containers/GitlabNamespacesSelect";
import { DocumentType, graphql } from "@/gql";
import { AccountPermission } from "@/gql/graphql";
import {
  Button,
  ButtonIcon,
  ButtonProps,
  LinkButton,
  LinkButtonProps,
} from "@/ui/Button";
import { Card } from "@/ui/Card";
import { Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { TextInput } from "@/ui/TextInput";
import { getItem, removeItem, setItem } from "@/util/storage";

import { GitLabLogo } from "../GitLab";
import {
  GitlabProjectList,
  GitlabProjectListProps,
} from "../GitlabProjectList";

const ConnectRepositoryQuery = graphql(`
  query ConnectRepository($accountSlug: String!) {
    account(slug: $accountSlug) {
      __typename
      id
      gitlabAccessToken
      glNamespaces {
        edges {
          id
          kind
          isProjectToken
          ...GitlabNamespacesSelect_GlApiNamespace
        }
      }
      permissions
      ... on Team {
        githubLightInstallation {
          id
          ghInstallation {
            id
            ...GithubInstallationsSelect_GhApiInstallation
          }
        }
      }
    }
    me {
      id
      ghInstallations {
        edges {
          id
          ...GithubInstallationsSelect_GhApiInstallation
        }
        pageInfo {
          totalCount
        }
      }
    }
  }
`);

type GithubInstallation = NonNullable<
  DocumentType<typeof ConnectRepositoryQuery>["me"]
>["ghInstallations"]["edges"][0];

type GitlabNamespace = NonNullable<
  NonNullable<
    DocumentType<typeof ConnectRepositoryQuery>["account"]
  >["glNamespaces"]
>["edges"][0];

type GithubInstallationsProps = {
  installations: GithubInstallation[];
  onSelectRepository: (repo: {
    name: string;
    owner_login: string;
    id: string;
  }) => void;
  disabled?: boolean;
  connectButtonLabel: string;
  onSwitch: () => void;
  fromAuthUser: boolean;
};

function GithubInstallations(props: GithubInstallationsProps) {
  const firstInstallation = props.installations[0];
  invariant(firstInstallation, "no installations");
  const [value, setValue] = React.useState<string>(firstInstallation.id);
  return (
    <div className="flex max-w-4xl flex-col gap-4" style={{ height: 400 }}>
      <GithubInstallationsSelect
        disabled={props.disabled}
        installations={props.installations}
        value={value}
        setValue={setValue}
        onSwitchProvider={props.onSwitch}
      />
      <GithubRepositoryList
        fromAuthUser={props.fromAuthUser}
        installationId={value}
        disabled={props.disabled}
        onSelectRepository={props.onSelectRepository}
        connectButtonLabel={props.connectButtonLabel}
      />
    </div>
  );
}

type GitlabNamespacesProps = {
  namespaces: GitlabNamespace[];
  disabled?: boolean;
  onSwitch: () => void;
  onSelectProject: GitlabProjectListProps["onSelectProject"];
  connectButtonLabel: GitlabProjectListProps["connectButtonLabel"];
  accountId: GitlabProjectListProps["accountId"];
};

const GitlabNamespaces = (props: GitlabNamespacesProps) => {
  // Take the first group namespace as default
  // Since the user with PAT should be fake, we can just ignore its namespace
  const defaultNamespace =
    props.namespaces.find((namespace) => namespace.kind === "group") ||
    props.namespaces[0];
  invariant(defaultNamespace, "no namespaces");
  const [value, setValue] = React.useState<string>(defaultNamespace.id);
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch] = useDebounce(search, 500);
  const namespace = props.namespaces.find(
    (namespace) => namespace.id === value,
  );
  invariant(value === "all" || namespace, "no active namespace");

  const projectListProps = (() => {
    if (namespace?.isProjectToken) {
      return { userId: undefined, groupId: undefined, allProjects: true };
    }
    switch (namespace?.kind) {
      case "user":
        return { userId: namespace.id, groupId: undefined, allProjects: false };
      case "group":
        return { userId: undefined, groupId: namespace.id, allProjects: false };
      default:
        return { userId: undefined, groupId: undefined, allProjects: true };
    }
  })();

  return (
    <div className="flex max-w-4xl flex-col gap-4" style={{ height: 400 }}>
      <GitlabNamespacesSelect
        disabled={props.disabled}
        namespaces={props.namespaces}
        value={value}
        setValue={setValue}
        onSwitch={props.onSwitch}
      />
      {value === "all" && (
        <div className="mb-2 flex flex-col gap-1">
          <label className="text-sm font-medium">Search</label>
          <TextInput
            name="search"
            placeholder="Project name"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>
      )}
      <GitlabProjectList
        {...projectListProps}
        disabled={props.disabled}
        onSelectProject={props.onSelectProject}
        connectButtonLabel={props.connectButtonLabel}
        accountId={props.accountId}
        search={debouncedSearch}
      />
    </div>
  );
};

enum GitProvider {
  GitHub = "github",
  GitHubLight = "github-light",
  GitLab = "gitlab",
}

function GitHubButton(props: {
  onPress: LinkButtonProps["onPress"];
  hasInstallations: boolean;
  children?: React.ReactNode;
  size?: ButtonProps["size"];
}) {
  const { pathname } = useLocation();
  if (!props.hasInstallations) {
    return (
      <LinkButton
        variant="github"
        size={props.size}
        href={`${config.get(
          "github.appUrl",
        )}/installations/new?state=${encodeURIComponent(pathname)}`}
      >
        <ButtonIcon>
          <MarkGithubIcon />
        </ButtonIcon>
        {props.children}
      </LinkButton>
    );
  }
  return <GitHubBaseButton {...props} />;
}

function GitHubBaseButton(props: {
  onPress: LinkButtonProps["onPress"];
  children?: React.ReactNode;
  size?: ButtonProps["size"];
}) {
  return (
    <Button variant="github" size={props.size} onPress={props.onPress}>
      <ButtonIcon>
        <MarkGithubIcon />
      </ButtonIcon>
      {props.children}
    </Button>
  );
}

function GitLabButton({
  children,
  ...props
}: ButtonProps & { children: React.ReactNode }) {
  return (
    <Button variant="gitlab" {...props}>
      <ButtonIcon>
        <GitLabLogo />
      </ButtonIcon>
      {children}
    </Button>
  );
}

type ConnectRepositoryProps = {
  onSelectRepository: GithubInstallationsProps["onSelectRepository"];
  onSelectProject: GitlabProjectListProps["onSelectProject"];
  disabled?: boolean;
  accountSlug: string;
  variant: "link" | "import";
};

const buttonLabels: Record<ConnectRepositoryProps["variant"], string> = {
  link: "Link Repository",
  import: "Import Repository",
};

export const ConnectRepository = (props: ConnectRepositoryProps) => {
  const [provider, setProvider] = React.useState<GitProvider | null>(
    getItem("gitProvider") as GitProvider | null,
  );
  const setAndStoreProvider = React.useCallback(
    (provider: GitProvider | null) => {
      setProvider(provider);
      if (provider) {
        setItem("gitProvider", provider);
      } else {
        removeItem("gitProvider");
      }
    },
    [],
  );

  const result = useQuery(ConnectRepositoryQuery, {
    variables: {
      accountSlug: props.accountSlug,
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    return (
      <Card className="h-full">
        <PageLoader />
      </Card>
    );
  }

  const { me, account } = result.data;

  invariant(me, "no me");
  invariant(account, "no account");

  if (!account.permissions.includes(AccountPermission.Admin)) {
    return (
      <div>
        You can't import a project in this team. Only team owners can import
        projects. If you want to import a project, please contact your team
        owner.
      </div>
    );
  }

  const hasGhInstallations = me.ghInstallations.edges.length > 0;
  const ghLightGhInstallation =
    account.__typename === "Team"
      ? account.githubLightInstallation?.ghInstallation
      : null;

  switch (provider) {
    case GitProvider.GitHub: {
      if (hasGhInstallations) {
        return (
          <GithubInstallations
            onSelectRepository={props.onSelectRepository}
            installations={me.ghInstallations.edges}
            disabled={props.disabled}
            connectButtonLabel={buttonLabels[props.variant]}
            onSwitch={() => setAndStoreProvider(null)}
            fromAuthUser
          />
        );
      }
      break;
    }
    case GitProvider.GitHubLight: {
      if (ghLightGhInstallation) {
        return (
          <GithubInstallations
            onSelectRepository={props.onSelectRepository}
            installations={[ghLightGhInstallation]}
            disabled={props.disabled}
            connectButtonLabel={buttonLabels[props.variant]}
            onSwitch={() => setAndStoreProvider(null)}
            fromAuthUser={false}
          />
        );
      }
      break;
    }
    case GitProvider.GitLab: {
      if (
        account.gitlabAccessToken &&
        account.glNamespaces &&
        account.glNamespaces.edges.length > 0
      ) {
        return (
          <GitlabNamespaces
            accountId={account.id}
            onSelectProject={props.onSelectProject}
            namespaces={account.glNamespaces.edges}
            disabled={props.disabled}
            connectButtonLabel={buttonLabels[props.variant]}
            onSwitch={() => setAndStoreProvider(null)}
          />
        );
      }

      return (
        <Card className="flex h-full flex-col items-center justify-center gap-4 p-4">
          <div
            className="text-center text-lg"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            To import a project from GitLab, you need to setup a GitLab access
            token first.
          </div>
          <div className="flex items-center justify-center gap-4">
            <LinkButton href="https://argos-ci.com/docs/gitlab" target="_blank">
              Setup GitLab Access token
            </LinkButton>
            <LinkButton
              variant="secondary"
              onPress={() => setAndStoreProvider(null)}
            >
              Use another Git provider
            </LinkButton>
          </div>
        </Card>
      );
    }
    case null: {
      break;
    }
    default:
      assertNever(provider);
  }

  switch (props.variant) {
    case "link": {
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4">
            <GitHubButton
              onPress={() => setAndStoreProvider(GitProvider.GitHub)}
              hasInstallations={hasGhInstallations}
            >
              GitHub
            </GitHubButton>
            {ghLightGhInstallation && (
              <GitHubBaseButton
                onPress={() => setAndStoreProvider(GitProvider.GitHubLight)}
              >
                GitHub (no content-access)
              </GitHubBaseButton>
            )}
            <GitLabButton
              onPress={() => setAndStoreProvider(GitProvider.GitLab)}
            >
              GitLab
            </GitLabButton>
          </div>
          <div>
            Need another provider?{" "}
            <Link href={`mailto:${config.get("contactEmail")}`} target="_blank">
              Contact us
            </Link>
          </div>
        </div>
      );
    }
    case "import": {
      return (
        <Card className="flex h-full flex-col items-center justify-center gap-4 py-4">
          <div className="text-low">
            Select a Git provider to import an existing project from a Git
            Repository.
          </div>
          <GitHubButton
            size="large"
            onPress={() => setAndStoreProvider(GitProvider.GitHub)}
            hasInstallations={hasGhInstallations}
          >
            Continue with GitHub
          </GitHubButton>
          {ghLightGhInstallation && (
            <GitHubBaseButton
              size="large"
              onPress={() => setAndStoreProvider(GitProvider.GitHubLight)}
            >
              Continue with GitHub (no content-access)
            </GitHubBaseButton>
          )}
          <GitLabButton
            size="large"
            onPress={() => setAndStoreProvider(GitProvider.GitLab)}
          >
            Continue with GitLab
          </GitLabButton>
        </Card>
      );
    }
    default:
      assertNever(props.variant);
  }
};
