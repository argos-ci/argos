import { useApolloClient } from "@apollo/client/react";
import { TEAM_AUTH_METHODS } from "@argos/schemas/team-auth-method";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";

import { TeamAuthMethodSignInButton } from "@/containers/Team/AuthMethodSignInButton";
import { DocumentType, graphql } from "@/gql";
import { TeamAuthMethod } from "@/gql/graphql";
import { Callout } from "@/ui/Callout";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Form } from "@/ui/Form";
import { FormCardFooter } from "@/ui/FormCardFooter";
import { FormRadio, FormRadioGroup } from "@/ui/FormRadio";

const _TeamFragment = graphql(`
  fragment TeamEnforcedAuthMethod_Team on Team {
    id
    slug
    enforcedAuthMethod
    viewerAuthMethod
    plan {
      id
      samlIncluded
    }
    samlPurchased
    samlSso {
      id
      enabled
    }
    teamDomains {
      id
    }
    ssoGithubAccount {
      id
    }
  }
`);

const SetTeamEnforcedAuthMethodMutation = graphql(`
  mutation TeamEnforcedAuthMethod_set(
    $teamAccountId: ID!
    $authMethod: TeamAuthMethod
  ) {
    setTeamEnforcedAuthMethod(
      input: { teamAccountId: $teamAccountId, authMethod: $authMethod }
    ) {
      id
      enforcedAuthMethod
    }
  }
`);

export function TeamEnforcedAuthMethod(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const client = useApolloClient();
  const hasSamlAccess = Boolean(team.plan?.samlIncluded || team.samlPurchased);
  return (
    <EnforcedAuthMethodCard
      teamSlug={team.slug}
      enforcedAuthMethod={team.enforcedAuthMethod ?? null}
      viewerAuthMethod={team.viewerAuthMethod ?? null}
      setUp={{
        [TeamAuthMethod.Google]: team.teamDomains.length > 0,
        [TeamAuthMethod.Github]: Boolean(team.ssoGithubAccount),
        [TeamAuthMethod.Saml]: hasSamlAccess && Boolean(team.samlSso?.enabled),
      }}
      onSave={async (authMethod) => {
        await client.mutate({
          mutation: SetTeamEnforcedAuthMethodMutation,
          variables: { teamAccountId: team.id, authMethod },
        });
      }}
    />
  );
}

const ANY_METHOD = "any";

type Inputs = { authMethod: TeamAuthMethod | typeof ANY_METHOD };

function toAuthMethod(value: Inputs["authMethod"]): TeamAuthMethod | null {
  return value === ANY_METHOD ? null : value;
}

const METHODS = [
  TeamAuthMethod.Google,
  TeamAuthMethod.Github,
  TeamAuthMethod.Saml,
];

const METHOD_COPY: Record<
  TeamAuthMethod,
  { description: string; missingSetUp: string; turnedOff: string }
> = {
  [TeamAuthMethod.Google]: {
    description:
      "Members sign in with a Google Workspace account on one of the team's domains.",
    missingSetUp: "Add a team domain to require it.",
    turnedOff:
      "The team has no domain, so members sign in with any method until you add one.",
  },
  [TeamAuthMethod.Github]: {
    description:
      "Members sign in with a GitHub account in the team's GitHub organization.",
    missingSetUp: "Set up GitHub Single Sign-On to require it.",
    turnedOff:
      "GitHub Single Sign-On is off, so members sign in with any method until it is back on.",
  },
  [TeamAuthMethod.Saml]: {
    description: "Members sign in through your identity provider.",
    missingSetUp: "Set up and enable SAML SSO to require it.",
    turnedOff:
      "SAML SSO is off, so members sign in with any method until it is back on.",
  },
};

export function EnforcedAuthMethodCard(props: {
  teamSlug: string;
  enforcedAuthMethod: TeamAuthMethod | null;
  /** The method the viewer meets for the team, among those it can require. */
  viewerAuthMethod: TeamAuthMethod | null;
  /** Whether the team has what members need to meet each method. */
  setUp: Record<TeamAuthMethod, boolean>;
  onSave: (authMethod: TeamAuthMethod | null) => Promise<void>;
}) {
  const { teamSlug, enforcedAuthMethod, viewerAuthMethod, setUp } = props;
  const form = useForm<Inputs>({
    defaultValues: { authMethod: enforcedAuthMethod ?? ANY_METHOD },
  });
  const selectedMethod = toAuthMethod(
    useWatch({ control: form.control, name: "authMethod" }),
  );
  // The method to sign in with before requiring it. The server refuses it too:
  // the viewer would lose access on their next request.
  const signInMethod =
    selectedMethod !== enforcedAuthMethod && selectedMethod !== viewerAuthMethod
      ? selectedMethod
      : null;

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await props.onSave(toAuthMethod(data.authMethod));
    form.reset(data);
  };

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit}>
        <CardBody>
          <CardTitle>Required sign-in method</CardTitle>
          <CardParagraph>
            Members must sign in with this method to reach the team. Tokens and
            apps they authorized from another sign-in lose access to it.
          </CardParagraph>
          <FormRadioGroup>
            <FormRadio
              {...form.register("authMethod")}
              value={ANY_METHOD}
              label={
                <div className="ml-2">
                  Any method
                  <p className="text-low text-sm font-normal">
                    Members sign in with any method Argos offers.
                  </p>
                </div>
              }
            />
            {METHODS.map((method) => (
              <FormRadio
                key={method}
                {...form.register("authMethod")}
                value={method}
                disabled={!setUp[method]}
                label={
                  <div className="ml-2">
                    {TEAM_AUTH_METHODS[method].label}
                    <p className="text-low text-sm font-normal">
                      {setUp[method]
                        ? METHOD_COPY[method].description
                        : METHOD_COPY[method].missingSetUp}
                    </p>
                  </div>
                }
              />
            ))}
          </FormRadioGroup>
          {signInMethod ? (
            <Callout className="mt-4">
              <div className="flex flex-col items-start gap-2">
                <p>
                  Sign in with {TEAM_AUTH_METHODS[signInMethod].requirement}{" "}
                  before requiring it, so you keep access to the team.
                </p>
                <TeamAuthMethodSignInButton
                  size="small"
                  authMethod={signInMethod}
                  teamSlug={teamSlug}
                  redirect={window.location.pathname}
                />
              </div>
            </Callout>
          ) : null}
          {enforcedAuthMethod && !setUp[enforcedAuthMethod] ? (
            <Callout className="mt-4">
              {METHOD_COPY[enforcedAuthMethod].turnedOff}
            </Callout>
          ) : null}
        </CardBody>
        <FormCardFooter
          control={form.control}
          disabled={signInMethod !== null}
        />
      </Form>
    </Card>
  );
}
