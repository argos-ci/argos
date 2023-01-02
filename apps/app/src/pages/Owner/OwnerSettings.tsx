import { ChevronDownIcon, ChevronRightIcon } from "@primer/octicons-react";
import {
  Disclosure,
  DisclosureContent,
  useDisclosureState,
} from "ariakit/disclosure";
import moment from "moment";
import { Helmet } from "react-helmet";
import { useParams } from "react-router-dom";

import config from "@/config";
import { Query } from "@/containers/Apollo";
import { SettingsLayout } from "@/containers/Layout";
import { DocumentType, graphql } from "@/gql";
import { NotFound } from "@/pages/NotFound";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardSeparator,
  CardTitle,
} from "@/ui/Card";
import { Container } from "@/ui/Container";
import { Anchor, Link } from "@/ui/Link";
import { PageLoader } from "@/ui/PageLoader";
import { Progress } from "@/ui/Progress";
import { StripePortalLink } from "@/ui/StripePortalLink";
import { Time } from "@/ui/Time";
import { Heading } from "@/ui/Typography";

import { useOwnerContext } from ".";

const OwnerQuery = graphql(`
  query OwnerSettings_owner($login: String!) {
    owner(login: $login) {
      id
      name
      screenshotsLimitPerMonth
      type
      stripeCustomerId

      plan {
        id
        name
        screenshotsLimitPerMonth
      }

      purchase {
        id
        source
      }

      repositories {
        id
        name
        private
        forcedPrivate
        currentMonthUsedScreenshots
      }
    }
  }
`);

type OwnerDocument = DocumentType<typeof OwnerQuery>;
type Plan = NonNullable<NonNullable<OwnerDocument["owner"]>["plan"]>;
type Purchase = NonNullable<NonNullable<OwnerDocument["owner"]>["purchase"]>;
type Repository = NonNullable<OwnerDocument["owner"]>["repositories"][0];

const sumUsedScreenshots = (repositories: Repository[]) =>
  repositories.reduce((sum, repo) => repo.currentMonthUsedScreenshots + sum, 0);

const ManageSubscriptionLink = ({
  purchase,
  stripeCustomerId,
}: {
  purchase: Purchase;
  stripeCustomerId: string | null;
}) => {
  if (purchase.source === "stripe") {
    return <StripePortalLink stripeCustomerId={stripeCustomerId} />;
  }

  return (
    <Anchor href={config.get("github.marketplaceUrl")} external>
      Manage your subscription on GitHub
    </Anchor>
  );
};

const PlanCard = ({
  ownerLogin,
  plan,
  purchase,
  repositories,
  stripeCustomerId,
}: {
  ownerLogin: string;
  plan: Plan;
  purchase: Purchase | null;
  repositories: Repository[];
  stripeCustomerId: string | null;
}) => {
  const free = plan.name === "free";
  const [privateRepos, publicRepos] = repositories.reduce(
    (all, repo) => {
      if (repo.private || repo.forcedPrivate) {
        all[0].push(repo);
      } else {
        all[1].push(repo);
      }
      return all;
    },
    [[] as Repository[], [] as Repository[]]
  );
  const hasStripePurchase = purchase && purchase.source === "stripe";
  return (
    <Card>
      <CardBody>
        <CardTitle>Plan</CardTitle>
        <CardParagraph>
          Your organization account is on the{" "}
          <strong className="capitalize">{plan.name} plan</strong>.
          {free && " Free of charge."}{" "}
          {!hasStripePurchase && (
            <Anchor href={config.get("github.marketplaceUrl")} external>
              Learn more
            </Anchor>
          )}
        </CardParagraph>
        <CardSeparator className="my-6" />
        <div className="my-6">
          <div className="font-medium">
            Current period (
            {
              <Time
                date={moment().startOf("month").toISOString()}
                format="MMM DD"
              />
            }{" "}
            -{" "}
            {
              <Time
                date={moment().endOf("month").toISOString()}
                format="MMM DD"
              />
            }
            )
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 rounded border border-border p-4">
              <div className="font-medium">Private repositories</div>
              <Consumption
                value={sumUsedScreenshots(privateRepos)}
                max={
                  plan.screenshotsLimitPerMonth === -1
                    ? Infinity
                    : plan.screenshotsLimitPerMonth
                }
              />
              {privateRepos.length > 0 && (
                <div>
                  <ConsumptionDetail repositories={privateRepos} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 rounded border border-border p-4">
              <div className="font-medium">Public repositories</div>
              <Consumption
                value={sumUsedScreenshots(publicRepos)}
                max={Infinity}
              />
              {publicRepos.length > 0 && (
                <div>
                  <ConsumptionDetail repositories={publicRepos} />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
      <CardFooter>
        {purchase ? (
          <ManageSubscriptionLink
            purchase={purchase}
            stripeCustomerId={stripeCustomerId}
          />
        ) : (
          <>
            Subscribe to plan using{" "}
            <Link to={`/${ownerLogin}/checkout`}>Stripe</Link> or{" "}
            <Anchor href={config.get("github.marketplaceUrl")} external>
              GitHub Marketplace
            </Anchor>{" "}
            .
          </>
        )}
      </CardFooter>
    </Card>
  );
};

const Consumption = ({ value, max }: { value: number; max: number }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between font-medium">
        <div>
          {value.toLocaleString()} {value > 1 ? "screenshots" : "screenshot"}
        </div>
        <div className="text-on-light">
          / {max === Infinity ? "Unlimited" : max.toLocaleString()}
        </div>
      </div>
      <Progress value={value} max={max} min={0} />
    </div>
  );
};

const PermissionCard = () => {
  return (
    <Card>
      <CardBody>
        <CardTitle>Permissions</CardTitle>
        <CardParagraph>
          Argos uses OAuth GitHub App to manage your repositories. You can
          revoke access to your repositories at any time.
        </CardParagraph>
      </CardBody>
      <CardFooter>
        <Anchor href={config.get("github.appUrl")} external>
          Manage repositories access restrictions from GitHub
        </Anchor>
      </CardFooter>
    </Card>
  );
};

const ConsumptionDetail = ({
  repositories,
}: {
  repositories: Repository[];
}) => {
  const disclosure = useDisclosureState({ defaultOpen: false });

  return (
    <>
      <Disclosure
        state={disclosure}
        className="text-sm text-on-light transition hover:text-on focus:outline-none"
      >
        {disclosure.open ? "Hide" : "Show"} usage detail{" "}
        {disclosure.open ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </Disclosure>

      <DisclosureContent
        state={disclosure}
        as="ul"
        className="mt-2 text-sm text-on-light"
      >
        {repositories.map((repo) => (
          <li
            key={repo.id}
            className="flex items-center justify-between border-b border-b-border py-1 px-1 last:border-b-0"
          >
            <span>{repo.name}</span>
            <span className="tabular-nums">
              {repo.currentMonthUsedScreenshots.toLocaleString()}
            </span>
          </li>
        ))}
      </DisclosureContent>
    </>
  );
};

export const OwnerSettings = () => {
  const { ownerLogin } = useParams();
  const { hasWritePermission } = useOwnerContext();

  if (!ownerLogin) {
    return <NotFound />;
  }

  if (!hasWritePermission) {
    return <NotFound />;
  }

  return (
    <Container>
      <Helmet>
        <title>{ownerLogin} • Settings</title>
      </Helmet>
      <Heading>Organization Settings</Heading>
      <Query
        fallback={<PageLoader />}
        query={OwnerQuery}
        variables={{ login: ownerLogin }}
      >
        {({ owner }) => {
          if (!owner) return <NotFound />;

          return (
            <SettingsLayout>
              {owner.plan && (
                <PlanCard
                  ownerLogin={ownerLogin}
                  plan={owner.plan}
                  purchase={owner.purchase ?? null}
                  repositories={owner.repositories}
                  stripeCustomerId={owner.stripeCustomerId ?? null}
                />
              )}
              <PermissionCard />
            </SettingsLayout>
          );
        }}
      </Query>
    </Container>
  );
};
