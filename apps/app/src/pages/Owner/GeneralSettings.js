import {
  CheckCircleFillIcon,
  ChevronRightIcon,
  LinkExternalIcon,
} from "@primer/octicons-react";
import { x } from "@xstyled/styled-components";
import { gql } from "graphql-tag";
import moment from "moment";

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
} from "@/components";
import config from "@/config";
import { getPossessiveForm, pluralize } from "@/modules/utils";

export const OwnerSettingsFragment = gql`
  fragment OwnerSettingsFragment on Owner {
    id
    name
    screenshotsLimitPerMonth

    plan {
      id
      name
      screenshotsLimitPerMonth
    }

    repositories {
      id
      name
      private
      currentMonthUsedScreenshots
    }
  }
`;

const Feature = ({ children, ...props }) => (
  <x.li display="flex" alignItems="center" gap={2} {...props}>
    <Icon as={CheckCircleFillIcon} mt="-1px" {...props} />
    {children}
  </x.li>
);

function PlanCard({ plan: { name, screenshotsLimitPerMonth }, ...props }) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
      </CardHeader>

      <CardBody>
        <x.div fontSize="4xl" mb={3}>
          {name}{" "}
          <x.span text="xs" color="primary" fontWeight="extrabold">
            Beta
          </x.span>
        </x.div>

        <x.ul display="flex" flexDirection="column" gap={2} my={4} ml={4}>
          <Feature>
            {screenshotsLimitPerMonth === -1
              ? "Unlimited"
              : `Up to ${screenshotsLimitPerMonth.toLocaleString()}`}{" "}
            screenshots
          </Feature>
          <Feature>Unlimited users</Feature>
          <Feature>Unlimited repositories</Feature>
        </x.ul>

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
        px={1}
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

function ConsumptionProgressBar({ screenshotsSum, screenshotsLimit = -1 }) {
  return (
    <x.div mt={2}>
      <x.div
        display="flex"
        justifyContent="space-between"
        alignItems="baseline"
      >
        <x.div>
          {screenshotsSum.toLocaleString()}{" "}
          <x.span> {pluralize("screenshot", screenshotsSum)}</x.span>
        </x.div>
        <x.div color="secondary-text">
          {" "}
          /{" "}
          {screenshotsLimit === -1
            ? Infinity
            : screenshotsLimit.toLocaleString()}
        </x.div>
      </x.div>

      <ProgressBar
        score={screenshotsSum}
        total={screenshotsLimit === -1 ? Infinity : screenshotsLimit}
        updateColor
        mt={2}
      />
    </x.div>
  );
}

function filterAndSortRepositories(repositories) {
  return repositories.reduce(
    (repos, repo) => {
      const privacy = repo.private ? "privateRepos" : "publicRepos";
      return repo.currentMonthUsedScreenshots === 0
        ? repos
        : { ...repos, [privacy]: [...repos[privacy], repo] };
    },
    { publicRepos: [], privateRepos: [] }
  );
}

const sumUsedScreenshots = (repositories) =>
  repositories.reduce((sum, repo) => repo.currentMonthUsedScreenshots + sum, 0);

function UsageCard({ repositories, screenshotsLimit, ...props }) {
  const { publicRepos, privateRepos } = filterAndSortRepositories(repositories);

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Monthly usage</CardTitle>
      </CardHeader>

      <CardBody display="flex" gap={8} flexDirection="column">
        <div>
          <CardTitle>Public repositories</CardTitle>
          <ConsumptionProgressBar
            screenshotsSum={sumUsedScreenshots(publicRepos)}
            repositories={publicRepos}
            screenshotsLimit={-1}
          />
          {publicRepos.length > 0 ? (
            <RepositoriesDetailsConsumption repositories={publicRepos} />
          ) : null}
        </div>

        <div>
          <CardTitle>Private repositories</CardTitle>
          <ConsumptionProgressBar
            screenshotsSum={sumUsedScreenshots(privateRepos)}
            screenshotsLimit={screenshotsLimit}
          />
          {privateRepos.length > 0 ? (
            <RepositoriesDetailsConsumption repositories={privateRepos} />
          ) : null}
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
  owner: { name, plan, repositories, screenshotsLimitPerMonth },
}) {
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
          {plan ? <PlanCard plan={plan} flex={1} /> : null}
          <UsageCard
            repositories={repositories}
            screenshotsLimit={screenshotsLimitPerMonth}
            flex={1}
          />
        </x.div>
      </SidebarLayout.PageContent>
    </>
  );
}
