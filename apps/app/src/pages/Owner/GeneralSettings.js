import React from "react";
import { Box } from "@smooth-ui/core-sc";
import styled from "@xstyled/styled-components";
import moment from "moment";
import { FaCheckCircle } from "react-icons/fa";
import { useOwner } from "./OwnerContext";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Text,
  Link,
} from "../../components";
import config from "../../config";

const List = styled.ul`
  list-style-type: none;
  padding-left: 0;
`;

const Feature = styled.li`
  margin: 2 0 2 3;
`;

const FeatureIcon = ({ icon, ...props }) => (
  <Box as={icon} mr={2} mb="-2px" {...props} />
);

const PlanName = styled.box`
  font-size: 36;
`;

function ProgressBar({ score, total, ...props }) {
  const progression = Math.min(1, score / total);

  return (
    <Box
      width={1}
      height={8}
      backgroundColor="light"
      borderRadius="base"
      {...props}
    >
      <Box
        ml="-1px"
        width={`calc(${Math.floor(progression * 100)}% + 2px)`}
        minWidth="8px"
        height={1}
        backgroundColor={
          progression === 1
            ? "danger"
            : progression > 0.75
            ? "warning"
            : "primary"
        }
        borderRadius="base"
      />
    </Box>
  );
}

const Plan = ({ purchase }) => {
  if (!purchase.plan) return <PlanName mb={2}>No plan</PlanName>;

  const { name, screenshotsLimitPerMonth } = purchase.plan;
  return (
    <React.Fragment>
      <PlanName>
        {name}&nbsp;
        <Text fontSize={14} color="light700">
          Beta
        </Text>
      </PlanName>
      <List>
        <Feature>
          <FeatureIcon icon={FaCheckCircle} />
          {screenshotsLimitPerMonth === Infinity
            ? "Unlimited screenshots"
            : `Up to ${screenshotsLimitPerMonth.toLocaleString()} screenshots`}
        </Feature>
        <Feature>
          <FeatureIcon icon={FaCheckCircle} />
          Unlimited users
        </Feature>
        <Feature>
          <FeatureIcon icon={FaCheckCircle} />
          Unlimited repositories
        </Feature>
      </List>
    </React.Fragment>
  );
};

export function GeneralSettings() {
  const owner = useOwner();
  let [currentPurchase, nextPurchase] = owner.purchases;
  const screenshotsLimitPerMonth = Infinity;

  return (
    <>
      <Text variant="h1">General Settings</Text>

      <Box
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "flex-start" }}
        mx={-2}
      >
        <Card m={2} flex={1}>
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
              <Box mt={4}>
                <hr />
                <Box mt={4} fontSize={14}>
                  From {new Date(nextPurchase.startDate).toLocaleDateString()}
                </Box>
                <Plan purchase={nextPurchase} />
              </Box>
            ) : null}

            {currentPurchase ? (
              <Box display="flex" justifyContent="flex-end">
                <Link
                  target="_blank"
                  href={config.get("github.marketplaceUrl")}
                >
                  Manage plan →
                </Link>
              </Box>
            ) : (
              <Link target="_blank" href={config.get("github.marketplaceUrl")}>
                Subscribe to Argos Plan to start →
              </Link>
            )}
          </CardBody>
        </Card>
        <Card m={2} flex={1}>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
          </CardHeader>
          <CardBody minHeight="220px">
            <CardTitle mb={2}>Used screenshots / month</CardTitle>
            <Text fontSize={20}>
              {owner.currentMonthUsedScreenshots.toLocaleString()}
            </Text>{" "}
            <Text color="light500">/ {screenshotsLimitPerMonth}</Text>
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
      </Box>
    </>
  );
}
