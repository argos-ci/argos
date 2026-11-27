import { useDeferredValue, useMemo, useState } from "react";
import { CombinedGraphQLErrors } from "@apollo/client";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { SearchIcon } from "lucide-react";
import { Helmet } from "react-helmet";

import { AuthGuard } from "@/containers/AuthGuard";
import { graphql } from "@/gql";
import { PlanInterval } from "@/gql/graphql";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderHeadline,
} from "@/ui/Layout";
import { PageLoader } from "@/ui/PageLoader";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

import {
  AnnualContractsTable,
  CandidatesTable,
  checkHasStaffData,
  MonthlyContractsTable,
  NoEnterpriseTeam,
  TrialsTable,
  type Candidate,
  type Contract,
} from "./EnterpriseTables";
import { StaffAccessRestricted } from "./StaffAccessRestricted";

const EnterpriseQuery = graphql(`
  query StaffEnterprise_staffEnterprise {
    staffEnterprise {
      candidates {
        id
        currency
        currentPeriodAmount
        previousPeriodAmount
        staffContactedAt
        team {
          id
          createdAt
          slug
          name
          stripeCustomerId
          lastBuildDate
          avatar {
            ...AccountAvatarFragment
          }
          staff {
            owners {
              id
              name
              email
            }
          }
        }
      }
      trials {
        id
        includedScreenshots
        periodStart
        periodEnd
        periodScreenshots
        team {
          id
          createdAt
          slug
          name
          stripeCustomerId
          lastBuildDate
          avatar {
            ...AccountAvatarFragment
          }
        }
      }
      contracts {
        id
        currency
        amount
        includedScreenshots
        periodStart
        periodEnd
        endDate
        periodScreenshots
        previousPeriodAmount
        renewalEmailedAt
        plan {
          id
          interval
        }
        team {
          id
          slug
          name
          stripeCustomerId
          lastBuildDate
          avatar {
            ...AccountAvatarFragment
          }
          staff {
            owners {
              id
              name
              email
            }
          }
        }
      }
    }
  }
`);

const LogRenewalEmailMutation = graphql(`
  mutation StaffEnterprise_logStaffEnterpriseRenewalEmail(
    $subscriptionId: ID!
  ) {
    logStaffEnterpriseRenewalEmail(input: { subscriptionId: $subscriptionId }) {
      id
      renewalEmailedAt
    }
  }
`);

const SetStaffEnterpriseOfferContactMutation = graphql(`
  mutation StaffEnterprise_setStaffEnterpriseOfferContact(
    $subscriptionId: ID!
    $contacted: Boolean!
  ) {
    setStaffEnterpriseOfferContact(
      input: { subscriptionId: $subscriptionId, contacted: $contacted }
    ) {
      id
      staffContactedAt
    }
  }
`);

function checkMatchesSearch(
  team: { name: string | null; slug: string },
  search: string,
) {
  if (!search) {
    return true;
  }

  const haystack = [team.name, team.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function SectionHeader(props: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-semibold">{props.title}</h2>
      <p className="text-low text-sm">{props.description}</p>
    </div>
  );
}

/**
 * The contract renewing or ending next comes first: it is the one to
 * renegotiate.
 */
function compareRenewals(left: Contract, right: Contract) {
  const getTime = (contract: Contract) => {
    const date = contract.endDate ?? contract.periodEnd;
    return date ? new Date(date).getTime() : Infinity;
  };
  return getTime(left) - getTime(right);
}

function compareAmounts(left: Contract, right: Contract) {
  return (right.amount ?? -1) - (left.amount ?? -1);
}

function StaffEnterpriseList() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const client = useApolloClient();
  const { data, loading, error } = useQuery(EnterpriseQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const { candidates, trials, monthly, annual } = useMemo(() => {
    const enterprise = data?.staffEnterprise;
    const contracts = (enterprise?.contracts ?? [])
      .filter(checkHasStaffData)
      .filter((contract) =>
        checkMatchesSearch(contract.team, normalizedSearch),
      );
    return {
      candidates: (enterprise?.candidates ?? [])
        .filter(checkHasStaffData)
        .filter((candidate) =>
          checkMatchesSearch(candidate.team, normalizedSearch),
        ),
      trials: (enterprise?.trials ?? [])
        .filter((trial) => checkMatchesSearch(trial.team, normalizedSearch))
        .sort(
          (left, right) => right.periodScreenshots - left.periodScreenshots,
        ),
      monthly: contracts
        .filter((contract) => contract.plan.interval === PlanInterval.Month)
        .sort(compareAmounts),
      annual: contracts
        .filter((contract) => contract.plan.interval === PlanInterval.Year)
        .sort(compareRenewals),
    };
  }, [data?.staffEnterprise, normalizedSearch]);

  const setContact = (candidate: Candidate, contacted: boolean) =>
    client.mutate({
      mutation: SetStaffEnterpriseOfferContactMutation,
      variables: { subscriptionId: candidate.id, contacted },
    });

  const logRenewalEmail = (contract: Contract) => {
    // Caught so a failed record never breaks the draft that just opened.
    client
      .mutate({
        mutation: LogRenewalEmailMutation,
        variables: { subscriptionId: contract.id },
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error));
      });
  };

  if (error) {
    const isForbidden =
      CombinedGraphQLErrors.is(error) &&
      error.errors.some((error) => error.extensions?.code === "FORBIDDEN");

    if (isForbidden) {
      return <StaffAccessRestricted />;
    }

    throw error;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <Heading>Enterprise</Heading>
          <PageHeaderHeadline>
            The Pro teams to offer Enterprise to, the teams trying it, and the
            teams on an Enterprise plan.
          </PageHeaderHeadline>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <TextInputGroup className="w-72">
            <TextInputIcon>
              <SearchIcon />
            </TextInputIcon>
            <TextInput
              type="search"
              placeholder="Search teams…"
              scale="sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </TextInputGroup>
        </PageHeaderActions>
      </PageHeader>
      {loading && !data ? (
        <PageLoader />
      ) : candidates.length + trials.length + monthly.length + annual.length ===
        0 ? (
        <NoEnterpriseTeam search={deferredSearch.trim()} />
      ) : (
        <div className="flex flex-col gap-10">
          {candidates.length > 0 ? (
            <section>
              <SectionHeader
                title="Candidates"
                description="Pro teams billed $1,500 or more this period or the last one: their Billing page offers Enterprise."
              />
              <CandidatesTable
                candidates={candidates}
                onContactChange={setContact}
              />
            </section>
          ) : null}
          {trials.length > 0 ? (
            <section>
              <SectionHeader
                title="Enterprise trials"
                description="Teams granted the Enterprise trial plan. The bar is this month's quota used, the mark how far into the month they are."
              />
              <TrialsTable trials={trials} />
            </section>
          ) : null}
          {monthly.length > 0 ? (
            <section>
              <SectionHeader
                title="Monthly contracts"
                description="The bar is this month's quota used, the mark how far into the month they are."
              />
              <MonthlyContractsTable contracts={monthly} />
            </section>
          ) : null}
          {annual.length > 0 ? (
            <section>
              <SectionHeader
                title="Annual contracts"
                description="Next renewal first. The bar is the yearly commitment used, the mark how far into the term they are."
              />
              <AnnualContractsTable
                contracts={annual}
                onRenewalEmail={logRenewalEmail}
              />
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}

export function Component() {
  return (
    <Page>
      <Helmet>
        <title>Enterprise</title>
      </Helmet>
      <AuthGuard>{() => <StaffEnterpriseList />}</AuthGuard>
    </Page>
  );
}
