import { MarkGithubIcon } from "@primer/octicons-react";
import * as React from "react";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { GithubInstallationsSelect } from "@/containers/GithubInstallationsSelect";
import { GitlabNamespacesSelect } from "@/containers/GitlabNamespacesSelect";
import { GithubRepositoryList } from "@/containers/GithubRepositoryList";
import { DocumentType, graphql } from "@/gql";
import { Button, ButtonIcon, ButtonProps } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { PageLoader } from "@/ui/PageLoader";
import { GitLabLogo } from "../GitLab";
import { useQuery } from "@apollo/client";
import {
  GitlabProjectList,
  GitlabProjectListProps,
} from "../GitlabProjectList";
import { Anchor } from "@/ui/Link";
import { Permission } from "@/gql/graphql";

const ConnectRepositoryQuery = graphql(`
  query ConnectRepository($accountSlug: String!) {
    account(slug: $accountSlug) {
      id
      gitlabAccessToken
      glNamespaces {
        edges {
          id
          kind
          ...GitlabNamespacesSelect_GlApiNamespace
        }
      }
      permissions
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
};

const GithubInstallations = (props: GithubInstallationsProps) => {
  const firstInstallation = props.installations[0];
  if (!firstInstallation) {
    throw new Error("No installations");
  }
  const [value, setValue] = React.useState<string>(firstInstallation.id);
  return (
    <div className="flex flex-col gap-4 max-w-4xl" style={{ height: 400 }}>
      <GithubInstallationsSelect
        disabled={props.disabled}
        installations={props.installations}
        value={value}
        setValue={setValue}
        onSwitch={props.onSwitch}
      />
      <GithubRepositoryList
        installationId={value}
        disabled={props.disabled}
        onSelectRepository={props.onSelectRepository}
        connectButtonLabel={props.connectButtonLabel}
      />
    </div>
  );
};

type GitlabNamespacesProps = {
  namespaces: GitlabNamespace[];
  disabled?: boolean;
  onSwitch: () => void;
  onSelectProject: GitlabProjectListProps["onSelectProject"];
  connectButtonLabel: GitlabProjectListProps["connectButtonLabel"];
  gitlabAccessToken: GitlabProjectListProps["gitlabAccessToken"];
};

const GitlabNamespaces = (props: GitlabNamespacesProps) => {
  // Take the first group namespace as default
  // Since the user with PAT should be fake, we can just ignore its namespace
  const defaultNamespace =
    props.namespaces.find((namespace) => namespace.kind === "group") ||
    props.namespaces[0];
  if (!defaultNamespace) {
    throw new Error("No namespaces");
  }
  const [value, setValue] = React.useState<string>(defaultNamespace.id);
  const namespace = props.namespaces.find(
    (namespace) => namespace.id === value,
  );
  if (!namespace) {
    throw new Error("No active namespace");
  }
  return (
    <div className="flex flex-col gap-4 max-w-4xl" style={{ height: 400 }}>
      <GitlabNamespacesSelect
        disabled={props.disabled}
        namespaces={props.namespaces}
        value={value}
        setValue={setValue}
        onSwitch={props.onSwitch}
      />
      <GitlabProjectList
        namespace={namespace}
        disabled={props.disabled}
        onSelectProject={props.onSelectProject}
        connectButtonLabel={props.connectButtonLabel}
        gitlabAccessToken={props.gitlabAccessToken}
      />
    </div>
  );
};

enum GitProvider {
  GitHub = "github",
  GitLab = "gitlab",
}

const GitHubButton = (props: {
  onClick: () => void;
  hasInstallations: boolean;
  children?: React.ReactNode;
  size?: ButtonProps["size"];
}) => {
  const { pathname } = useLocation();
  if (!props.hasInstallations) {
    return (
      <Button color="neutral" size={props.size}>
        {(buttonProps) => (
          <a
            href={`${config.get(
              "github.appUrl",
            )}/installations/new?state=${encodeURIComponent(pathname)}`}
            onClick={props.onClick}
            {...buttonProps}
          >
            <ButtonIcon>
              <MarkGithubIcon />
            </ButtonIcon>
            {props.children}
          </a>
        )}
      </Button>
    );
  }
  return (
    <Button color="neutral" size={props.size} onClick={props.onClick}>
      <ButtonIcon>
        <MarkGithubIcon />
      </ButtonIcon>
      {props.children}
    </Button>
  );
};

const GitLabButton = ({
  children,
  ...props
}: ButtonProps & { children: React.ReactNode }) => {
  return (
    <Button {...props}>
      <ButtonIcon>
        <GitLabLogo />
      </ButtonIcon>
      {children}
    </Button>
  );
};

export type ConnectRepositoryProps = {
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
    window.localStorage.getItem("gitProvider") as GitProvider | null,
  );
  const setAndStoreProvider = React.useCallback(
    (provider: GitProvider | null) => {
      setProvider(provider);
      if (provider) {
        window.localStorage.setItem("gitProvider", provider);
      } else {
        window.localStorage.removeItem("gitProvider");
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

  if (!me) {
    throw new Error("Invariant: no me");
  }

  if (!account) {
    throw new Error("Invariant: no account");
  }

  if (!account.permissions.includes(Permission.Write)) {
    return (
      <div>
        You can't import a project in this team. Only team owners can import
        projects. If you want to import a project, please contact your team
        owner.
      </div>
    );
  }

  const hasGhInstallations = me.ghInstallations.edges.length > 0;

  if (provider === GitProvider.GitHub && hasGhInstallations) {
    return (
      <GithubInstallations
        onSelectRepository={props.onSelectRepository}
        installations={me.ghInstallations.edges}
        disabled={props.disabled}
        connectButtonLabel={buttonLabels[props.variant]}
        onSwitch={() => setAndStoreProvider(null)}
      />
    );
  }

  if (provider === GitProvider.GitLab) {
    if (
      account.gitlabAccessToken &&
      account.glNamespaces &&
      account.glNamespaces.edges.length > 0
    ) {
      return (
        <GitlabNamespaces
          gitlabAccessToken={account.gitlabAccessToken}
          onSelectProject={props.onSelectProject}
          namespaces={account.glNamespaces.edges}
          disabled={props.disabled}
          connectButtonLabel={buttonLabels[props.variant]}
          onSwitch={() => setAndStoreProvider(null)}
        />
      );
    }
    return (
      <Card className="flex h-full flex-col items-center justify-center p-4 gap-4">
        <div
          className="text-lg text-center"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          To import a project from GitLab, you need to setup a GitLab access
          token first.
        </div>
        <div className="flex gap-4 items-center justify-center">
          <Button>
            {(buttonProps) => (
              <a {...buttonProps} href="#">
                {/* TODO: Link to GitLab access token setup */}
                Setup GitLab Access token
              </a>
            )}
          </Button>
          <Button
            color="neutral"
            variant="outline"
            onClick={() => setAndStoreProvider(null)}
          >
            Use another Git provider
          </Button>
        </div>
      </Card>
    );
  }

  switch (props.variant) {
    case "link": {
      return (
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4">
            <GitHubButton
              onClick={() => setAndStoreProvider(GitProvider.GitHub)}
              hasInstallations={hasGhInstallations}
            >
              GitHub
            </GitHubButton>
            <GitLabButton
              onClick={() => setAndStoreProvider(GitProvider.GitLab)}
            >
              GitLab
            </GitLabButton>
          </div>
          <div>
            Need another provider?{" "}
            <Anchor href={`mailto:${config.get("contactEmail")}`}>
              Contact us
            </Anchor>
          </div>
        </div>
      );
    }
    case "import": {
      return (
        <Card className="flex h-full flex-col items-center justify-center py-4 gap-4">
          <div className="text-low">
            Select a Git provider to import an existing project from a Git
            Repository.
          </div>
          <GitHubButton
            size="large"
            onClick={() => setAndStoreProvider(GitProvider.GitHub)}
            hasInstallations={hasGhInstallations}
          >
            Continue with GitHub
          </GitHubButton>
          <GitLabButton
            size="large"
            onClick={() => setAndStoreProvider(GitProvider.GitLab)}
          >
            Continue with GitLab
          </GitLabButton>
        </Card>
      );
    }
    default:
      throw new Error("Invalid variant");
  }
};
