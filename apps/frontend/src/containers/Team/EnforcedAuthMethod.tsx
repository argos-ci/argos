import { useApolloClient } from "@apollo/client/react";
import { TEAM_AUTH_METHOD_LABELS } from "@argos/schemas/team-auth-method";
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
      samlEnabled={hasSamlAccess && Boolean(team.samlSso?.enabled)}
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

const OPTIONS: {
  value: Inputs["authMethod"];
  label: string;
  description: string;
}[] = [
  {
    value: ANY_METHOD,
    label: "Any method",
    description: "Members sign in with any method Argos offers.",
  },
  {
    value: TeamAuthMethod.Google,
    label: TEAM_AUTH_METHOD_LABELS[TeamAuthMethod.Google],
    description: "Members sign in with their Google account.",
  },
  {
    value: TeamAuthMethod.Github,
    label: TEAM_AUTH_METHOD_LABELS[TeamAuthMethod.Github],
    description: "Members sign in with their GitHub account.",
  },
  {
    value: TeamAuthMethod.Saml,
    label: TEAM_AUTH_METHOD_LABELS[TeamAuthMethod.Saml],
    description: "Members sign in through your identity provider.",
  },
];

export function EnforcedAuthMethodCard(props: {
  teamSlug: string;
  enforcedAuthMethod: TeamAuthMethod | null;
  /** How the viewer signed in for the team, among the methods it can require. */
  viewerAuthMethod: TeamAuthMethod | null;
  /** Whether members can sign in with SAML SSO, which requiring it needs. */
  samlEnabled: boolean;
  onSave: (authMethod: TeamAuthMethod | null) => Promise<void>;
}) {
  const { teamSlug, enforcedAuthMethod, viewerAuthMethod, samlEnabled } = props;
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
            {OPTIONS.map((option) => {
              const disabled =
                option.value === TeamAuthMethod.Saml && !samlEnabled;
              return (
                <FormRadio
                  key={option.value}
                  {...form.register("authMethod")}
                  value={option.value}
                  disabled={disabled}
                  label={
                    <div className="ml-2">
                      {option.label}
                      <p className="text-low text-sm font-normal">
                        {disabled
                          ? "Set up and enable SAML SSO to require it."
                          : option.description}
                      </p>
                    </div>
                  }
                />
              );
            })}
          </FormRadioGroup>
          {signInMethod ? (
            <Callout className="mt-4">
              <div className="flex flex-col items-start gap-2">
                <p>
                  You did not sign in with{" "}
                  {TEAM_AUTH_METHOD_LABELS[signInMethod]}. Sign in with it
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
          {enforcedAuthMethod === TeamAuthMethod.Saml && !samlEnabled ? (
            <Callout className="mt-4">
              SAML SSO is off, so members sign in with any method until it is
              back on.
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
