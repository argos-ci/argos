import React from "react";
import { x } from "@xstyled/styled-components";
import moment from "moment";
import { FaCheckCircle } from "react-icons/fa";

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Link,
  PrimaryTitle,
  ProgressBar,
  SidebarLayout,
} from "@argos-ci/app/src/components";
import config from "../../config";
import { useOwner } from "../../containers/OwnerContext";
import { getPossessiveForm } from "../../modules/utils";

const Feature = (props) => (
  <x.li display="flex" alignItems="center" gap={2} {...props} />
);
const FeatureIcon = (props) => <x.svg mt="-1px" {...props} />;
const PlanName = (props) => <x.div fontSize="4xl" mb={3} {...props} />;

const Plan = ({ purchase }) => {
  if (!purchase.plan) return <PlanName mb={2}>No plan</PlanName>;

  const { name, screenshotsLimitPerMonth } = purchase.plan;
  return (
    <React.Fragment>
      <PlanName>
        {name}{" "}
        <x.span text="xs" color="primary-500" fontWeight={800}>
          Beta
        </x.span>
      </PlanName>
      <x.ul display="flex" flexDirection="column" gap={2} my={4} ml={4}>
        <Feature>
          <FeatureIcon as={FaCheckCircle} />
          {screenshotsLimitPerMonth === Infinity
            ? "Unlimited screenshots"
            : `Up to ${screenshotsLimitPerMonth.toLocaleString()} screenshots`}
        </Feature>
        <Feature>
          <FeatureIcon as={FaCheckCircle} />
          Unlimited users
        </Feature>
        <Feature>
          <FeatureIcon as={FaCheckCircle} />
          Unlimited repositories
        </Feature>
      </x.ul>
    </React.Fragment>
  );
};

function PlanCard({ owner, screenshotsLimitPerMonth, ...props }) {
  let [currentPurchase, nextPurchase] = owner.purchases;

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Plan</CardTitle>
      </CardHeader>
      <CardBody>
        <Plan
          purchase={{
            ...currentPurchase,
            screenshotsLimitPerMonth: screenshotsLimitPerMonth,
          }}
        />

        {nextPurchase ? (
          <x.div mt={4}>
            <hr />
            <x.div mt={4} fontSize="sm">
              From {new Date(nextPurchase.startDate).toLocaleDateString()}
            </x.div>
            <Plan purchase={nextPurchase} />
          </x.div>
        ) : null}

        {currentPurchase ? (
          <x.div display="flex" justifyContent="flex-end">
            <Link target="_blank" href={config.get("github.marketplaceUrl")}>
              Manage plan →
            </Link>
          </x.div>
        ) : (
          <Link target="_blank" href={config.get("github.marketplaceUrl")}>
            Subscribe to Argos Plan to start →
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

function UsageCard({ owner, screenshotsLimitPerMonth, ...props }) {
  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardBody minHeight="220px">
        <CardTitle mb={2}>Used screenshots</CardTitle>
        <x.span fontSize="xl">
          {owner.currentMonthUsedScreenshots.toLocaleString()}
        </x.span>{" "}
        <x.span color="gray-500">/ {screenshotsLimitPerMonth}</x.span>
        <ProgressBar
          score={owner.currentMonthUsedScreenshots}
          total={screenshotsLimitPerMonth}
          mt={2}
        />
        <CardTitle mt={4} mb={2}>
          Next reset date
        </CardTitle>
        {moment()
          .add(1, "month")
          .startOf("month")
          .toDate()
          .toLocaleDateString()}
      </CardBody>
    </Card>
  );
}

export function GeneralSettings() {
  const { owner } = useOwner();
  if (!owner) return null;
  const screenshotsLimitPerMonth = Infinity;

  return (
    <>
      <SidebarLayout.PageTitle>
        <PrimaryTitle>
          {getPossessiveForm(owner.name)} General Settings
        </PrimaryTitle>
      </SidebarLayout.PageTitle>

      <SidebarLayout.PageContent>
        <x.div
          display="flex"
          flexDirection={{ _: "column", md: "row" }}
          alignItems={{ _: "stretch", md: "flex-start" }}
          gap={4}
        >
          <PlanCard
            owner={owner}
            screenshotsLimitPerMonth={screenshotsLimitPerMonth}
            flex={1}
          />
          <UsageCard
            owner={owner}
            screenshotsLimitPerMonth={screenshotsLimitPerMonth}
            flex={1}
          />
        </x.div>
      </SidebarLayout.PageContent>
    </>
  );
}
