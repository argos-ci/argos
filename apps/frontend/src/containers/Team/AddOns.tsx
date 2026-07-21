import { MarkGithubIcon } from "@primer/octicons-react";
import { LockIcon } from "lucide-react";

import { GITHUB_SSO_PRICING, SAML_SSO_PRICING } from "@/constants";
import { ConfigureGitHubSSO } from "@/containers/Team/GitHubSSO/Configure";
import { DocumentType, graphql } from "@/gql";
import { AccountSubscriptionStatus } from "@/gql/graphql";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";

import { DisableGitHubSSOButton } from "./GitHubSSO";
import {
  DisableSAMLSSOAddOnButton,
  EnableSAMLSSOAddOnButton,
} from "./SAMLSSOAddOn";

const _TeamFragment = graphql(`
  fragment TeamAddOns_Team on Team {
    id
    slug
    subscriptionStatus
    samlPurchased
    plan {
      id
      githubSsoIncluded
      samlIncluded
      usageBased
    }
    ssoGithubAccount {
      id
    }
    ...SAMLSSOAddOn_Team
  }
`);

export function TeamAddOns(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const hasActiveSubscription =
    team.subscriptionStatus === AccountSubscriptionStatus.Active;
  const usageBased = Boolean(team.plan?.usageBased);
  const githubSsoIncluded = Boolean(team.plan?.githubSsoIncluded);
  const samlIncluded = Boolean(team.plan?.samlIncluded);
  const githubSsoEnabled = Boolean(team.ssoGithubAccount);
  const samlEnabled = team.samlPurchased;
  return (
    <Card>
      <CardBody>
        <CardTitle>Add-ons</CardTitle>
        <CardParagraph>
          Optional features billed monthly in addition to your plan.
        </CardParagraph>
        <div className="divide-y rounded-sm border text-sm">
          <AddOnRow
            icon={<MarkGithubIcon className="size-6 shrink-0" />}
            title="GitHub Single Sign-On"
            description="Synchronize your team members with your GitHub organization."
            enabled={githubSsoEnabled}
            price={
              githubSsoIncluded ? (
                "Included in your plan"
              ) : (
                <>${GITHUB_SSO_PRICING} / month</>
              )
            }
            action={
              githubSsoEnabled ? (
                <DisableGitHubSSOButton teamAccountId={team.id} />
              ) : (
                <ConfigureGitHubSSO
                  teamAccountId={team.id}
                  priced={!githubSsoIncluded}
                  disabledReason={
                    !hasActiveSubscription
                      ? "You must have an active subscription to enable GitHub SSO."
                      : !githubSsoIncluded && !usageBased
                        ? "This feature is not available on your current plan, please contact us."
                        : undefined
                  }
                />
              )
            }
          />
          <AddOnRow
            icon={<LockIcon className="size-6 shrink-0" />}
            title="SAML Single Sign-On"
            description="Allow team members to sign in with your Identity Provider."
            enabled={samlIncluded || samlEnabled}
            price={
              samlIncluded ? (
                "Included in your plan"
              ) : (
                <>${SAML_SSO_PRICING} / month</>
              )
            }
            action={
              samlIncluded ? null : samlEnabled ? (
                <DisableSAMLSSOAddOnButton teamAccountId={team.id} />
              ) : (
                <EnableSAMLSSOAddOnButton team={team} />
              )
            }
          />
        </div>
      </CardBody>
      <CardFooter>
        Configure Single Sign-On in the{" "}
        <Link href={`/${team.slug}/settings/authentication`}>
          Authentication settings
        </Link>
        .
      </CardFooter>
    </Card>
  );
}

function AddOnRow(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  price: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      {props.icon}
      <div className="flex-1">
        <div className="flex items-center gap-2 font-medium">
          {props.title}
          {props.enabled && (
            <Chip scale="xs" color="success">
              Enabled
            </Chip>
          )}
        </div>
        <p className="text-low">{props.description}</p>
      </div>
      <div className="text-low">{props.price}</div>
      {props.action}
    </div>
  );
}
