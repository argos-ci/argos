import { useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import {
  Building2Icon,
  CheckCheckIcon,
  CheckCircleIcon,
  FolderIcon,
  ImageIcon,
  MessageSquareIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Navigate, useSearchParams } from "react-router-dom";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useIsLoggedIn } from "@/containers/Auth";
import { OAuthAppLogo, VerifiedBadge } from "@/containers/OAuthAppLogo";
import { graphql, type DocumentType } from "@/gql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { BrandShield } from "@/ui/BrandShield";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { Container } from "@/ui/Container";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { Label } from "@/ui/Label";

const ConsentQuery = graphql(`
  query OAuthAuthorize_Consent(
    $clientId: ID!
    $redirectUri: String!
    $scope: String!
  ) {
    oauthConsentInfo(
      clientId: $clientId
      redirectUri: $redirectUri
      scope: $scope
    ) {
      redirectValid
      client {
        id
        clientId
        name
        verified
        knownAppId
        homepage
      }
      scopes {
        scope
        title
        description
      }
    }
    me {
      id
      slug
      name
      avatar {
        ...AccountAvatarFragment
      }
      teams {
        id
        slug
        name
        avatar {
          ...AccountAvatarFragment
        }
      }
    }
  }
`);

const AuthorizeMutation = graphql(`
  mutation OAuthAuthorize_Authorize($input: AuthorizeOAuthConsentInput!) {
    authorizeOAuthConsent(input: $input) {
      redirectUri
    }
  }
`);

type OAuthParams = {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string | null;
  codeChallenge: string;
  resource: string | null;
};

function buildDenyUrl(redirectUri: string, state: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", "access_denied");
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

type ConsentData = NonNullable<
  DocumentType<typeof ConsentQuery>["oauthConsentInfo"]
>;
type Me = NonNullable<DocumentType<typeof ConsentQuery>["me"]>;

type Inputs = { accountIds: string[]; scopes: string[] };

type ConsentScope = ConsentData["scopes"][number];

/** Presentation for each scope group (keyed by the scope's resource prefix). */
const SCOPE_GROUPS: Record<string, { label: string; icon: LucideIcon }> = {
  profile: { label: "Profile", icon: UserIcon },
  projects: { label: "Projects", icon: FolderIcon },
  builds: { label: "Builds", icon: ImageIcon },
  reviews: { label: "Reviews", icon: CheckCheckIcon },
  comments: { label: "Comments", icon: MessageSquareIcon },
  account: { label: "Organization", icon: Building2Icon },
};

type ScopeGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  scopes: ConsentScope[];
};

/**
 * Group requested scopes by their resource (the part before `:`) so the consent
 * screen shows one icon + heading per resource rather than a flat list. First-
 * seen order is preserved (the backend already returns scopes in a stable order).
 */
function groupScopes(scopes: readonly ConsentScope[]): ScopeGroup[] {
  const groups: ScopeGroup[] = [];
  for (const scope of scopes) {
    const key = scope.scope.split(":")[0] ?? scope.scope;
    const existing = groups.find((group) => group.key === key);
    if (existing) {
      existing.scopes.push(scope);
      continue;
    }
    const meta = SCOPE_GROUPS[key] ?? { label: key, icon: CheckCircleIcon };
    groups.push({ key, label: meta.label, icon: meta.icon, scopes: [scope] });
  }
  return groups;
}

function ConsentForm(props: {
  params: OAuthParams;
  consent: ConsentData;
  me: Me;
}) {
  const { params, consent, me } = props;
  const apollo = useApolloClient();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const availableAccounts = [
    { id: me.id, name: me.name, slug: me.slug, avatar: me.avatar },
    ...me.teams,
  ];
  const isSingleAccount = availableAccounts.length === 1;

  const form = useForm<Inputs>({
    defaultValues: {
      // Default to the personal account only — teams are opt-in (least privilege).
      accountIds: [me.id],
      // All requested scopes are checked by default; the user may uncheck any to
      // grant a narrower set (OAuth 2.1 / RFC 6749 §3.3 downscoping).
      scopes: consent.scopes.map((scope) => scope.scope),
    },
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const accountIds = isSingleAccount ? [me.id] : data.accountIds;
    if (accountIds.length === 0) {
      form.setError("accountIds", {
        type: "validate",
        message: "Select at least one organization to authorize",
      });
      return;
    }
    if (data.scopes.length === 0) {
      form.setError("scopes", {
        type: "validate",
        message: "Select at least one permission to grant",
      });
      return;
    }
    setStatus("loading");
    try {
      const result = await apollo.mutate({
        mutation: AuthorizeMutation,
        variables: {
          input: {
            clientId: params.clientId,
            redirectUri: params.redirectUri,
            scopes: data.scopes,
            accountIds,
            state: params.state,
            codeChallenge: params.codeChallenge,
            codeChallengeMethod: "S256",
            resource: params.resource,
          },
        },
      });
      const redirectUri = result.data?.authorizeOAuthConsent.redirectUri;
      if (!redirectUri) {
        setStatus("error");
        return;
      }
      window.location.href = redirectUri;
    } catch {
      setStatus("error");
    }
  };

  if (status === "error") {
    return (
      <Alert>
        <AlertTitle>Authorization failed</AlertTitle>
        <AlertText>
          Something went wrong while authorizing {consent.client.name}. Please
          try again.
        </AlertText>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <BrandShield className="w-12" />
        <span className="text-low text-2xl">→</span>
        <OAuthAppLogo
          name={consent.client.name}
          knownAppId={consent.client.knownAppId}
          size="lg"
        />
      </div>

      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold">
          Authorize {consent.client.name}
          {consent.client.verified && <VerifiedBadge />}
        </h1>
        <p className="text-low mt-1 text-sm">
          Signed in as{" "}
          <span className="text-default font-medium">@{me.slug}</span>
        </p>
      </div>

      <Form form={form} onSubmit={onSubmit} className="w-full">
        <Card className="w-full">
          <CardBody className="flex flex-col gap-4">
            <div>
              <div className="text-sm font-medium">
                {consent.client.name} is requesting access to:
              </div>
              <p className="text-low mt-0.5 text-xs">
                Uncheck anything you don’t want to grant.
              </p>
              <CheckboxGroupField
                control={form.control}
                name="scopes"
                className="mt-3"
              >
                {groupScopes(consent.scopes).map((group) => {
                  const Icon = group.icon;
                  return (
                    <div key={group.key} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="text-low size-4 shrink-0" />
                        {group.label}
                      </div>
                      <div className="flex flex-col gap-1.5 pl-6">
                        {group.scopes.map((scope) => (
                          <Checkbox key={scope.scope} value={scope.scope}>
                            <span className="flex flex-col gap-0.5">
                              <span className="text-sm">{scope.title}</span>
                              <span className="text-low text-xs">
                                {scope.description}
                              </span>
                            </span>
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CheckboxGroupField>
              {form.formState.errors.scopes && (
                <ErrorMessage className="mt-2">
                  {form.formState.errors.scopes.message}
                </ErrorMessage>
              )}
            </div>

            {isSingleAccount ? (
              <div>
                <Label>Organization</Label>
                <div className="flex items-center gap-2 text-sm">
                  <AccountAvatar avatar={me.avatar} className="size-4" />
                  {me.name ?? me.slug}{" "}
                  <span className="text-low">@{me.slug}</span>
                </div>
              </div>
            ) : (
              <div>
                <Label>Organizations this application can access</Label>
                <CheckboxGroupField
                  control={form.control}
                  name="accountIds"
                  isInvalid={Boolean(form.formState.errors.accountIds)}
                >
                  {availableAccounts.map((account) => (
                    <Checkbox key={account.id} value={account.id}>
                      <AccountAvatar
                        avatar={account.avatar}
                        className="size-4"
                      />
                      {account.name ?? account.slug}{" "}
                      <span className="text-low">@{account.slug}</span>
                    </Checkbox>
                  ))}
                </CheckboxGroupField>
                {form.formState.errors.accountIds && (
                  <ErrorMessage className="mt-2">
                    {form.formState.errors.accountIds.message}
                  </ErrorMessage>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-4 flex w-full flex-col gap-2">
          <Button
            type="submit"
            isDisabled={status === "loading"}
            size="large"
            className="w-full justify-center"
          >
            {status === "loading"
              ? "Authorizing…"
              : `Authorize ${consent.client.name}`}
          </Button>
          <LinkButton
            href={buildDenyUrl(params.redirectUri, params.state)}
            variant="secondary"
            size="large"
            className="w-full justify-center"
          >
            Cancel
          </LinkButton>
          {consent.client.homepage && (
            <p className="text-low text-center text-xs">
              Learn more about{" "}
              <a
                href={consent.client.homepage}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {consent.client.name}
              </a>
            </p>
          )}
        </div>
      </Form>
    </div>
  );
}

function AuthorizeLoader(props: { params: OAuthParams }) {
  const { params } = props;
  const { data, loading } = useQuery(ConsentQuery, {
    variables: {
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scope: params.scope,
    },
  });

  if (loading) {
    return <p className="text-low text-center text-sm">Loading…</p>;
  }

  const consent = data?.oauthConsentInfo;
  if (!consent) {
    return (
      <Alert>
        <AlertTitle>Unknown application</AlertTitle>
        <AlertText>
          This authorization request references an application Argos does not
          recognize.
        </AlertText>
      </Alert>
    );
  }

  if (!consent.redirectValid) {
    return (
      <Alert>
        <AlertTitle>Invalid redirect URL</AlertTitle>
        <AlertText>
          The redirect URL is not registered for {consent.client.name}, so this
          request cannot be completed safely.
        </AlertText>
      </Alert>
    );
  }

  if (!data?.me) {
    return null;
  }

  return <ConsentForm params={params} consent={consent} me={data.me} />;
}

const InvalidRequestPage = (props: { children: React.ReactNode }) => (
  <Container className="mt-12 max-w-sm">
    <Alert>
      <AlertTitle>Invalid request</AlertTitle>
      <AlertText>{props.children}</AlertText>
      <AlertActions>
        <LinkButton href="/" variant="secondary">
          Go home
        </LinkButton>
      </AlertActions>
    </Alert>
  </Container>
);

export function Component() {
  const [searchParams] = useSearchParams();
  const isLoggedIn = useIsLoggedIn();

  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const scope = searchParams.get("scope") ?? "";
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  if (!clientId || !redirectUri) {
    return (
      <InvalidRequestPage>
        Missing client_id or redirect_uri parameter.
      </InvalidRequestPage>
    );
  }

  if (responseType && responseType !== "code") {
    return (
      <InvalidRequestPage>
        Only the <code>code</code> response type is supported.
      </InvalidRequestPage>
    );
  }

  // PKCE is mandatory; only S256 is accepted.
  if (
    !codeChallenge ||
    (codeChallengeMethod && codeChallengeMethod !== "S256")
  ) {
    return (
      <InvalidRequestPage>
        A PKCE <code>code_challenge</code> using the <code>S256</code> method is
        required.
      </InvalidRequestPage>
    );
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to={`/login?r=${encodeURIComponent(window.location.href)}`}
        replace
      />
    );
  }

  const params: OAuthParams = {
    clientId,
    redirectUri,
    scope,
    state: searchParams.get("state"),
    codeChallenge,
    resource: searchParams.get("resource"),
  };

  return (
    <>
      <Helmet>
        <title>Authorize application</title>
      </Helmet>
      <Container className="mt-12 max-w-md px-4">
        <AuthorizeLoader params={params} />
      </Container>
    </>
  );
}
