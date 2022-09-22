import * as React from "react";
import { x } from "@xstyled/styled-components";
import moment from "moment";
import {
  CheckCircleFillIcon,
  ChevronRightIcon,
  LinkExternalIcon,
} from "@primer/octicons-react";
import { gql } from "graphql-tag";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Disclosure,
  DisclosureContent,
  Icon,
  Link,
  LinkBlock,
  PrimaryTitle,
  ProgressBar,
  SidebarLayout,
  Time,
  useDisclosureState,
} from "@argos-ci/app/src/components";
import config from "../../config";
import { getPossessiveForm, pluralize } from "../../modules/utils";

export const OwnerSettingsFragment = gql`
  fragment OwnerSettingsFragment on Owner {
    name
    screenshotsLimitPerMonth
    repositories {
      id
      name
      private
      currentMonthUsedScreenshots
    }
    purchases {
      id
      startDate
      endDate
      plan {
        id
        name
        screenshotsLimitPerMonth
      }
    }
  }
`;

const Feature = (props) => (
  <x.li display="flex" alignItems="center" gap={2} {...props} />
);
const FeatureIcon = (props) => <Icon mt="-1px" {...props} />;
const PlanName = (props) => <x.div fontSize="4xl" mb={3} {...props} />;

const Plan = ({ purchase }) => {
  if (!purchase?.plan) return <PlanName mb={2}>No plan</PlanName>;

  return (
    <React.Fragment>
      <PlanName>
        {purchase.plan.name}{" "}
        <x.span text="xs" color="primary-500" fontWeight={800}>
          Beta
        </x.span>
      </PlanName>
      <x.ul display="flex" flexDirection="column" gap={2} my={4} ml={4}>
        <Feature>
          <FeatureIcon as={CheckCircleFillIcon} />
          {purchase.plan.screenshotsLimitPerMonth === -1
            ? "Unlimited screenshots"
            : `Up to ${purchase.plan.screenshotsLimitPerMonth.toLocaleString()} screenshots`}
        </Feature>
        <Feature>
          <FeatureIcon as={CheckCircleFillIcon} />
          Unlimited users
        </Feature>
        <Feature>
          <FeatureIcon as={CheckCircleFillIcon} />
          Unlimited repositories
        </Feature>
      </x.ul>
    </React.Fragment>
  );
};

function PlanCard({ purchases, ...props }) {
  let [currentPurchase, nextPurchase] = purchases;

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
      </CardHeader>
      <CardBody>
        <Plan purchase={currentPurchase} />

        {nextPurchase ? (
          <x.div mt={4}>
            <hr />
            <x.div mt={4} fontSize="sm">
              From {new Date(nextPurchase.startDate).toLocaleDateString()}
            </x.div>
            <Plan purchase={nextPurchase} />
          </x.div>
        ) : null}

        <x.div display="flex" justifyContent="flex-end">
          <Link target="_blank" href={config.get("github.marketplaceUrl")}>
            Manage plan on GitHub <LinkExternalIcon />
          </Link>
        </x.div>
      </CardBody>
    </Card>
  );
}

function RepositoriesDetailsConsumption({ repositories }) {
  const disclosure = useDisclosureState({ defaultOpen: false });

  return (
    <>
      <LinkBlock
        as={Disclosure}
        state={disclosure}
        color="secondary-text"
        mt={2}
        ml={-1}
        pl={0}
        pr={2}
      >
        <x.div
          as={ChevronRightIcon}
          transform
          rotate={disclosure.open ? 90 : 0}
          transitionDuration={300}
          mr={1}
        />
        {disclosure.open ? "Hide" : "Show"} consumption details
      </LinkBlock>

      <x.div
        as={DisclosureContent}
        state={disclosure}
        backgroundColor="highlight-background"
        borderRadius="md"
        py={1}
        px={2}
        mt={2}
      >
        <ul>
          {repositories.map((repo) => (
            <x.li
              key={repo.id}
              my={2}
              display="flex"
              justifyContent="space-between"
            >
              <x.div color="secondary-text">{repo.name}</x.div>
              <x.div whiteSpace="nowrap">
                {repo.currentMonthUsedScreenshots.toLocaleString()}{" "}
                {pluralize("screenshot", repo.currentMonthUsedScreenshots)}
              </x.div>
            </x.li>
          ))}
        </ul>
      </x.div>
    </>
  );
}

function RepositoriesConsumption({ repositories, screenshotsLimit }) {
  const screenshotsCount = repositories.reduce(
    (sum, repo) => repo.currentMonthUsedScreenshots + sum,
    0
  );

  return (
    <x.div mt={2}>
      <x.div
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
      >
        <x.div>
          {screenshotsCount.toLocaleString()}{" "}
          <x.span> {pluralize("screenshot", screenshotsCount)}</x.span>
        </x.div>
        <x.div color="secondary-text">
          {" "}
          /{" "}
          {screenshotsLimit === Infinity
            ? screenshotsLimit
            : screenshotsLimit.toLocaleString()}
        </x.div>
      </x.div>

      <ProgressBar
        score={screenshotsCount}
        total={screenshotsLimit}
        updateColor
        mt={2}
      />

      {repositories.length > 0 ? (
        <RepositoriesDetailsConsumption repositories={repositories} />
      ) : null}
    </x.div>
  );
}

function UsageCard({ repositories, screenshotsLimit, ...props }) {
  const publicActiveRepos = repositories.filter(
    (repo) => !repo.private && repo.currentMonthUsedScreenshots > 0
  );

  const privateActiveRepos = repositories.filter(
    (repo) => repo.private && repo.currentMonthUsedScreenshots > 0
  );

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Monthly usage</CardTitle>
      </CardHeader>
      <CardBody display="flex" gap={8} flexDirection="column">
        <div>
          <CardTitle>Public repositories</CardTitle>
          <RepositoriesConsumption
            repositories={publicActiveRepos}
            screenshotsLimit={Infinity}
          />
        </div>

        <div>
          <CardTitle>Private repositories</CardTitle>
          <RepositoriesConsumption
            repositories={privateActiveRepos}
            screenshotsLimit={screenshotsLimit}
          />
        </div>

        <x.div
          display="flex"
          alignItems="baseline"
          flexWrap="wrap"
          columnGap={4}
        >
          <CardTitle whiteSpace="nowrap">Next reset date</CardTitle>
          <Time
            date={moment().add(1, "month").startOf("month").toISOString()}
            flex={1}
            textAlign="right"
            whiteSpace="nowrap"
          />
        </x.div>
      </CardBody>
    </Card>
  );
}

export function GeneralSettings({
  owner: { name, purchases, screenshotsLimitPerMonth, repositories },
}) {
  const screenshotsLimit =
    screenshotsLimitPerMonth === -1 ? "Infinity" : screenshotsLimitPerMonth;

  return (
    <>
      <SidebarLayout.PageTitle>
        <PrimaryTitle>{getPossessiveForm(name)} General Settings</PrimaryTitle>
      </SidebarLayout.PageTitle>

      <SidebarLayout.PageContent>
        <x.div
          display="flex"
          flexDirection={{ _: "column", md: "row" }}
          alignItems={{ _: "stretch", md: "flex-start" }}
          gap={4}
        >
          <PlanCard purchases={purchases} flex={1} />
          <UsageCard
            repositories={repositories}
            screenshotsLimit={screenshotsLimit}
            flex={1}
          />
        </x.div>
      </SidebarLayout.PageContent>
    </>
  );
}
