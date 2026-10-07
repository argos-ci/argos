import { useId, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { isHttpUri, isSafeUri } from "@argos/util/url";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { clsx } from "clsx";
import {
  Building2Icon,
  CheckCheckIcon,
  CheckCircleIcon,
  FolderIcon,
  ImageIcon,
  ImagesIcon,
  LockIcon,
  MessageSquareIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import {
  useController,
  useForm,
  useWatch,
  type Control,
  type SubmitHandler,
} from "react-hook-form";
import { Navigate, useSearchParams } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useAuth } from "@/containers/Auth";
import { OAuthAppLogo, VerifiedBadge } from "@/containers/OAuthAppLogo";
import { graphql, type DocumentType } from "@/gql";
import { OAuthScopeLevel } from "@/gql/graphql";
import { Alert, AlertActions, AlertText, AlertTitle } from "@/ui/Alert";
import { BrandShield } from "@/ui/BrandShield";
import { Button, LinkButton } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
import { Checkbox } from "@/ui/Checkbox";
import { CheckboxGroupField } from "@/ui/CheckboxGroup";
import { Container } from "@/ui/Container";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { Tooltip } from "@/ui/Tooltip";
import {
  getConsentPresets,
  getConsentStorageKey,
  getGrantedScopes,
  getInitialConsentValues,
  getRememberedConsent,
  rememberConsent,
  REQUIRED_SCOPES,
  type ConsentAccess,
  type ConsentPreset,
  type ConsentValues,
} from "@/util/oauth-consent";

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
        level
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

type ConsentScope = ConsentData["scopes"][number];

const PRESETS: Record<OAuthScopeLevel, { label: string; description: string }> =
  {
    [OAuthScopeLevel.Read]: {
      label: "Read only",
      description: "View projects, builds, comments and media.",
    },
    [OAuthScopeLevel.Write]: {
      label: "Read and write",
      description:
        "Also upload builds, review changes, comment and upload media.",
    },
    [OAuthScopeLevel.Admin]: {
      label: "Admin",
      description:
        "Also create and configure projects, and manage organizations.",
    },
  };

/** Presentation for each scope group (keyed by the scope's resource prefix). */
const SCOPE_GROUPS: Record<string, { label: string; icon: LucideIcon }> = {
  profile: { label: "Profile", icon: UserIcon },
  projects: { label: "Projects", icon: FolderIcon },
  builds: { label: "Builds", icon: ImageIcon },
  reviews: { label: "Reviews", icon: CheckCheckIcon },
  comments: { label: "Comments", icon: MessageSquareIcon },
  media: { label: "Media", icon: ImagesIcon },
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

function AccessOption(props: {
  value: ConsentAccess;
  label: string;
  description: string;
}) {
  const { value, label, description } = props;
  const labelId = useId();
  const descriptionId = useId();
  return (
    // Base UI renders each radio's hidden input beside it: without a wrapper,
    // the input would count as a row of the list and draw its own divider.
    <div>
      <Radio.Root
        value={value}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className={clsx(
          "group/option flex w-full cursor-default items-start gap-3 px-4 py-3 select-none",
          "data-checked:bg-primary-subtle not-data-checked:hover:bg-subtle",
          "focus-visible:ring-primary-active focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "border-primary mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            "group-data-checked/option:border-primary-active group-data-checked/option:bg-primary-solid",
          )}
        >
          <span className="hidden size-1.5 rounded-full bg-white group-data-checked/option:block" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={labelId} className="text-sm font-medium">
            {label}
          </span>
          <span id={descriptionId} className="text-low text-xs">
            {description}
          </span>
        </span>
      </Radio.Root>
    </div>
  );
}

function AccessField(props: {
  control: Control<ConsentValues>;
  presets: readonly ConsentPreset[];
  canCustomize: boolean;
  onCustomize: (from: OAuthScopeLevel) => void;
}) {
  const { control, presets, canCustomize, onCustomize } = props;
  const { field } = useController({ control, name: "access" });
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <div id={labelId} className="text-sm font-semibold">
        Permissions
      </div>
      <RadioGroup
        aria-labelledby={labelId}
        value={field.value}
        onValueChange={(value) => {
          if (value === "custom" && field.value !== "custom") {
            onCustomize(field.value);
          }
          field.onChange(value);
        }}
        className="border-thin divide-y-thin overflow-hidden rounded-lg"
      >
        {presets.map((preset) => (
          <AccessOption
            key={preset.level}
            value={preset.level}
            {...PRESETS[preset.level]}
          />
        ))}
        {canCustomize && (
          <AccessOption
            value="custom"
            label="Custom"
            description="Pick individual permissions."
          />
        )}
      </RadioGroup>
    </div>
  );
}

function CustomScopesField(props: {
  control: Control<ConsentValues>;
  scopes: readonly ConsentScope[];
  clientName: string;
}) {
  const { control, scopes, clientName } = props;
  return (
    <CheckboxGroupField
      control={control}
      name="customScopes"
      aria-label="Custom permissions"
    >
      <div className="flex flex-col gap-4">
        {groupScopes(scopes).map((group) => {
          const Icon = group.icon;
          return (
            <section key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Icon className="text-low size-4 shrink-0" />
                <span className="text-sm font-semibold">{group.label}</span>
              </div>
              <div className="flex flex-col gap-2 pl-6">
                {group.scopes.map((scope) => {
                  // Required scopes (e.g. profile) can't be unchecked: show a
                  // lock with a tooltip instead of a checkbox.
                  if (REQUIRED_SCOPES.has(scope.scope)) {
                    return (
                      <div
                        key={scope.scope}
                        className="flex items-center gap-2"
                      >
                        <Tooltip
                          content={`${clientName} always needs your profile to know who authorized it, so it can’t be turned off.`}
                        >
                          <button
                            type="button"
                            aria-label="Always granted"
                            className="text-low focus-visible:ring-primary flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm outline-none focus-visible:ring-2"
                          >
                            <LockIcon className="size-3.5" />
                          </button>
                        </Tooltip>
                        <span className="text-sm">{scope.description}</span>
                      </div>
                    );
                  }
                  return (
                    <Checkbox key={scope.scope} value={scope.scope}>
                      <span className="text-sm">{scope.description}</span>
                    </Checkbox>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </CheckboxGroupField>
  );
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
  const presets = getConsentPresets(consent.scopes);
  const canCustomize = consent.scopes.some(
    (scope) => !REQUIRED_SCOPES.has(scope.scope),
  );
  const storageKey = getConsentStorageKey({
    userId: me.id,
    client: consent.client,
  });

  const [defaultValues] = useState(() =>
    getInitialConsentValues({
      scopes: consent.scopes,
      accountIds: availableAccounts.map((account) => account.id),
      remembered: getRememberedConsent(storageKey),
    }),
  );
  const form = useForm<ConsentValues>({ defaultValues });
  const access = useWatch({ control: form.control, name: "access" });

  const onSubmit: SubmitHandler<ConsentValues> = async (data) => {
    const accountIds = isSingleAccount ? [me.id] : data.accountIds;
    if (accountIds.length === 0) {
      form.setError("accountIds", {
        type: "validate",
        message: "Select at least one organization to authorize",
      });
      return;
    }
    const scopes = getGrantedScopes({
      scopes: consent.scopes,
      access: data.access,
      customScopes: data.customScopes,
    });
    if (scopes.length === 0) {
      form.setError("customScopes", {
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
            scopes,
            accountIds,
            state: params.state,
            codeChallenge: params.codeChallenge,
            codeChallengeMethod: "S256",
            resource: params.resource,
          },
        },
      });
      const redirectUri = result.data?.authorizeOAuthConsent.redirectUri;
      if (!redirectUri || !isSafeUri(redirectUri)) {
        setStatus("error");
        return;
      }
      rememberConsent(storageKey, {
        access: data.access,
        scopes,
        accountIds:
          accountIds.length === availableAccounts.length ? "all" : accountIds,
      });
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
    <div className="flex flex-col items-center gap-6 pb-8">
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
        <h1 className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-2xl font-semibold">
          Authorize {consent.client.name}
          {consent.client.verified && <VerifiedBadge scale="sm" />}
        </h1>
        <p className="text-low mt-1 text-sm">
          Signed in as{" "}
          <span className="text-default font-medium">@{me.slug}</span>
        </p>
      </div>

      <Form form={form} onSubmit={onSubmit} className="w-full">
        <Card className="w-full">
          <CardBody className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {presets.length > 1 || canCustomize ? (
                <AccessField
                  control={form.control}
                  presets={presets}
                  canCustomize={canCustomize}
                  onCustomize={(level) => {
                    // Start from what the preset grants. Required scopes have
                    // no checkbox, and are added back on submit.
                    form.setValue(
                      "customScopes",
                      getGrantedScopes({
                        scopes: consent.scopes,
                        access: level,
                        customScopes: [],
                      }).filter((scope) => !REQUIRED_SCOPES.has(scope)),
                    );
                  }}
                />
              ) : (
                <section className="flex flex-col gap-2">
                  <div className="text-sm font-semibold">Permissions</div>
                  <ul className="flex flex-col gap-1 text-sm">
                    {consent.scopes.map((scope) => (
                      <li key={scope.scope}>{scope.description}</li>
                    ))}
                  </ul>
                </section>
              )}
              {access === "custom" && (
                <>
                  <CustomScopesField
                    control={form.control}
                    scopes={consent.scopes}
                    clientName={consent.client.name}
                  />
                  {form.formState.errors.customScopes && (
                    <ErrorMessage>
                      {form.formState.errors.customScopes.message}
                    </ErrorMessage>
                  )}
                </>
              )}
            </div>

            <section className="flex flex-col gap-2">
              <div className="text-sm font-semibold">Accounts</div>
              {isSingleAccount ? (
                <div className="flex items-center gap-2 text-sm">
                  <AccountAvatar avatar={me.avatar} className="size-5" />
                  <span>{me.name ?? me.slug}</span>
                  <span className="text-low">@{me.slug}</span>
                </div>
              ) : (
                <>
                  <CheckboxGroupField
                    control={form.control}
                    name="accountIds"
                    aria-label="Accounts"
                  >
                    {availableAccounts.map((account) => (
                      <Checkbox key={account.id} value={account.id}>
                        <AccountAvatar
                          avatar={account.avatar}
                          className="size-5"
                        />
                        <span className="text-sm">
                          {account.name ?? account.slug}
                        </span>
                        <span className="text-low text-sm">
                          @{account.slug}
                        </span>
                      </Checkbox>
                    ))}
                  </CheckboxGroupField>
                  {form.formState.errors.accountIds && (
                    <ErrorMessage>
                      {form.formState.errors.accountIds.message}
                    </ErrorMessage>
                  )}
                </>
              )}
            </section>
          </CardBody>
        </Card>

        <div className="mt-4 flex w-full flex-col gap-2">
          <Button
            type="submit"
            disabled={status === "loading"}
            size="large"
            className="w-full justify-center"
          >
            {status === "loading"
              ? "Authorizing…"
              : `Authorize ${consent.client.name}`}
          </Button>
          <LinkButton
            href={
              isSafeUri(params.redirectUri)
                ? buildDenyUrl(params.redirectUri, params.state)
                : "/"
            }
            variant="secondary"
            size="large"
            className="w-full justify-center"
          >
            Cancel
          </LinkButton>
          {consent.client.homepage && isHttpUri(consent.client.homepage) && (
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
          recognize. A connection that is not approved within a day expires:
          remove Argos from the application and connect it again.
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

  if (consent.scopes.length === 0) {
    return (
      <Alert>
        <AlertTitle>No permissions requested</AlertTitle>
        <AlertText>
          {consent.client.name} did not ask for any permission Argos supports,
          so there is nothing to authorize.
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
  const auth = useAuth();

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

  if (auth.status === "anonymous") {
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
      <Container className="mt-12 max-w-xl px-4">
        <AuthorizeLoader params={params} />
      </Container>
    </>
  );
}
