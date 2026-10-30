import { MarkGithubIcon } from "@primer/octicons-react";
import { LockIcon, NetworkIcon } from "lucide-react";

import {
  GITHUB_SSO_PRICING,
  SAML_SSO_PRICING,
  STATIC_IP_PRICING,
} from "@/constants";
import { ConfigureGitHubSSO } from "@/containers/Team/GitHubSSO/Configure";
import { DocumentType, graphql } from "@/gql";
import { LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { getAddOnBlockedReason } from "@/util/subscription";

import { DisableGitHubSSOButton } from "./GitHubSSO";
import {
  DisableSAMLSSOAddOnButton,
  EnableSAMLSSOAddOnButton,
} from "./SAMLSSOAddOn";
import { DisableStaticIpButton, EnableStaticIpButton } from "./StaticIpAddOn";

const _TeamFragment = graphql(`
  fragment TeamAddOns_Team on Team {
    id
    slug
    subscriptionStatus
    samlPurchased
    staticIpEnabled
    subscription {
      id
      provider
    }
    plan {
      id
      githubSsoIncluded
      samlIncluded
      staticIpIncluded
      usageBased
      interval
    }
    ssoGithubAccount {
      id
    }
    samlSso {
      id
      enabled
    }
    ...SAMLSSOAddOn_Team
    ...StaticIpAddOn_Team
    ...AddOnsPricingTable_Team
  }
`);

export function TeamAddOns(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const usageBased = Boolean(team.plan?.usageBased);
  const githubSsoIncluded = Boolean(team.plan?.githubSsoIncluded);
  const samlIncluded = Boolean(team.plan?.samlIncluded);
  const githubSsoEnabled = Boolean(team.ssoGithubAccount);
  // With SAML in the plan, `samlPurchased` grants nothing: only the
  // configuration says whether SAML is on.
  const samlEnabled = samlIncluded
    ? Boolean(team.samlSso?.enabled)
    : team.samlPurchased;
  const authenticationSettingsUrl = `/${team.slug}/settings/authentication`;
  const staticIpIncluded = Boolean(team.plan?.staticIpIncluded);
  const githubSsoBlockedReason = getAddOnBlockedReason({
    status: team.subscriptionStatus,
    provider: team.subscription?.provider,
    interval: team.plan?.interval,
    includedInPlan: githubSsoIncluded,
    usageBased,
    featureName: "GitHub SSO",
  });
  return (
    <Card>
      <CardBody>
        <CardTitle>Add-ons</CardTitle>
        <CardParagraph>
          Optional features billed monthly in addition to your plan.
        </CardParagraph>
        <div className="border-thin divide-y-thin rounded-lg text-sm">
          <AddOnRow
            icon={<MarkGithubIcon className="size-6 shrink-0" />}
            title="GitHub Single Sign-On"
            description="Synchronize your team members with your GitHub organization."
            enabled={githubSsoEnabled}
            included={githubSsoIncluded}
            price={GITHUB_SSO_PRICING}
            action={
              githubSsoEnabled ? (
                <DisableGitHubSSOButton teamAccountId={team.id} />
              ) : (
                <ConfigureGitHubSSO
                  team={team}
                  priced={!githubSsoIncluded}
                  disabledReason={githubSsoBlockedReason ?? undefined}
                />
              )
            }
          />
          <AddOnRow
            icon={<LockIcon className="size-6 shrink-0" />}
            title="SAML Single Sign-On"
            description="Allow team members to sign in with your Identity Provider."
            enabled={samlEnabled}
            included={samlIncluded}
            price={SAML_SSO_PRICING}
            action={
              samlIncluded ? (
                <LinkButton
                  variant={samlEnabled ? "secondary" : "primary"}
                  href={authenticationSettingsUrl}
                >
                  {samlEnabled ? "Manage" : "Configure"}
                </LinkButton>
              ) : samlEnabled ? (
                <DisableSAMLSSOAddOnButton teamAccountId={team.id} />
              ) : (
                <EnableSAMLSSOAddOnButton team={team} />
              )
            }
          />
          <AddOnRow
            icon={<NetworkIcon className="size-6 shrink-0" />}
            title="Static IP"
            description="Reach GitHub from static IP addresses your organization can add to its IP allow list."
            enabled={team.staticIpEnabled}
            included={staticIpIncluded}
            price={STATIC_IP_PRICING}
            action={
              team.staticIpEnabled ? (
                <DisableStaticIpButton team={team} />
              ) : (
                <EnableStaticIpButton team={team} />
              )
            }
          />
        </div>
      </CardBody>
      <CardFooter>
        Configure Single Sign-On in the{" "}
        <Link href={authenticationSettingsUrl}>Authentication settings</Link>,
        and find the static IP addresses in the{" "}
        <Link href={`/${team.slug}/settings/integrations#static-ip`}>
          Integrations settings
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
  included: boolean;
  price: number;
  action: React.ReactNode;
}) {
  return (
    // On a phone the description takes the width, and the price and the
    // action move under it: side by side, the text was a word per line.
    <div className="flex items-center gap-4 p-4 max-md:grid max-md:grid-cols-[auto_1fr] max-md:gap-y-3">
      {props.icon}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {props.title}
          {props.included && (
            <Chip scale="xs" color="neutral">
              Included in your plan
            </Chip>
          )}
          {props.enabled && (
            <Chip scale="xs" color="success">
              Enabled
            </Chip>
          )}
        </div>
        <p className="text-low">{props.description}</p>
      </div>
      <div className="flex items-center gap-4 max-md:col-start-2 max-md:justify-end">
        {!props.included && (
          <div className="text-low max-md:mr-auto">${props.price} / month</div>
        )}
        {props.action}
      </div>
    </div>
  );
}
