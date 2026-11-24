import { useQuery } from "@apollo/client/react";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  BoxesIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  ImagesIcon,
  MailIcon,
  UsersIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import {
  getInvoiceStatusProps,
  isPartiallyRefunded,
} from "@/containers/Account/Invoices";
import { AccountAvatar } from "@/containers/AccountAvatar";
import { useAssertAuthAccount } from "@/containers/Auth";
import { AuthGuard } from "@/containers/AuthGuard";
import { TeamMemberLabel } from "@/containers/UserList";
import { graphql, type DocumentType } from "@/gql";
import { TeamUserLevel } from "@/gql/graphql";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { useDialogValueState } from "@/ui/Dialog";
import { Heading } from "@/ui/Heading";
import {
  Page,
  PageContainer,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderHeadline,
} from "@/ui/Layout";
import { Link } from "@/ui/Link";
import { ListLoadMore } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { PageLoader } from "@/ui/PageLoader";
import { StatTile, StatTileGroup } from "@/ui/StatTile";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";
import { formatCurrency } from "@/util/intl";

import { getAccountURL } from "../Account/AccountParams";
import { NotFound } from "../NotFound";
import { getProjectURL } from "../Project/ProjectParams";
import {
  formatDaysLeft,
  formatPrice,
  getIntervalUnit,
  getPeriodAmount,
  getPeriodFlatPrice,
  PRO_PLAN_NAME,
} from "./pricing";
import { StaffAccessRestricted } from "./StaffAccessRestricted";
import { StaffTeamActionsMenu } from "./StaffTeamActionsMenu";
import { StaffTrialDialog, type StaffTrialMode } from "./StaffTrialDialog";
import { StripeCustomerLink } from "./stripe";
import { SubscriptionLabel } from "./SubscriptionLabel";
import { useCopyOwnerEmails } from "./useCopyOwnerEmails";

const PROJECTS_LIMIT = 100;
const INITIAL_INVOICES_COUNT = 5;
const INVOICES_PER_PAGE = 20;

const StaffTeamInvoicesFragment = graphql(`
  fragment StaffTeamInvoices on InvoiceConnection {
    pageInfo {
      totalCount
      hasNextPage
    }
    edges {
      id
      number
      date
      total
      currency
      status
      refundedAmount
      hostedUrl
      pdfUrl
    }
  }
`);

const StaffTeamQuery = graphql(`
  query StaffTeam_account(
    $slug: String!
    $projectsLimit: Int!
    $invoicesFirst: Int!
    $isStaff: Boolean!
  ) {
    account(slug: $slug) {
      id
      # Read for staff only: anyone else needs the billing permission, and a
      # plain member refused it would get an error page instead of the
      # restricted-access notice.
      invoices(after: 0, first: $invoicesFirst) @include(if: $isStaff) {
        ...StaffTeamInvoices
      }
      ... on Team {
        createdAt
        slug
        name
        stripeCustomerId
        subscriptionStatus
        last30DaysScreenshots
        lastBuildDate
        avatar {
          ...AccountAvatarFragment
        }
        subscription {
          id
          provider
          endDate
          paymentMethodFilled
        }
        projects(first: $projectsLimit) {
          pageInfo {
            totalCount
          }
          edges {
            id
            name
            buildsCount
          }
        }
        staff {
          projectsCount
          buildsCount
          screenshotsCount
          firstComparisonAt
          trialEndsAt
          flatPrice
          includedScreenshots
          plan {
            id
            name
            displayName
            interval
          }
          addOns {
            label
            monthlyPrice
          }
          contact {
            id
            date
            user {
              id
              slug
              name
            }
          }
          periodUsage {
            currentPeriodScreenshotsCount
            storybookRatio
            billingPeriods {
              from
              to
              endsAt
              closed
              screenshotsCount
              additionalScreenshotsCost
              invoicedAmount
            }
          }
          members {
            id
            level
            joinedAt
            lastSeenAt
            user {
              id
              slug
              name
              email
              avatar {
                ...AccountAvatarFragment
              }
            }
          }
        }
      }
    }
  }
`);

const StaffTeamInvoicesQuery = graphql(`
  query StaffTeam_invoices($slug: String!, $after: Int!, $first: Int!) {
    account(slug: $slug) {
      id
      invoices(after: $after, first: $first) {
        ...StaffTeamInvoices
      }
    }
  }
`);

type AccountNode = NonNullable<DocumentType<typeof StaffTeamQuery>["account"]>;
type TeamNode = Extract<AccountNode, { __typename?: "Team" }>;
type StaffTeam = TeamNode & {
  staff: NonNullable<TeamNode["staff"]>;
  invoices: NonNullable<TeamNode["invoices"]>;
};
type BillingPeriod = NonNullable<
  StaffTeam["staff"]["periodUsage"]
>["billingPeriods"][number];
type StaffMember = StaffTeam["staff"]["members"][number];
type StaffInvoice = DocumentType<
  typeof StaffTeamInvoicesFragment
>["edges"][number];

function Dash() {
  return <span className="text-low">-</span>;
}

function Section(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3">
        <Heading level={2} className="text-lg font-semibold">
          {props.title}
        </Heading>
        {props.description ? (
          <p className="text-low text-sm">{props.description}</p>
        ) : null}
      </div>
      {props.children}
    </section>
  );
}

/** Label and value pairs. A null value reads as a dash. */
function DetailCard(props: {
  title: string;
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <Card>
      <CardBody>
        <Heading level={2} className="mb-4 text-base font-semibold">
          {props.title}
        </Heading>
        <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
          {props.items.map((item) => (
            <div key={item.label} className="contents">
              <dt className="text-low">{item.label}</dt>
              <dd className="min-w-0">{item.value ?? <Dash />}</dd>
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function StaffTable(props: {
  head: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border">
      <table
        className={clsx("w-full border-collapse text-sm", props.className)}
      >
        <thead>
          <tr className="text-low border-b text-xs font-semibold">
            {props.head}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-subtle [&>tr:nth-child(odd)]:bg-app [&>tr]:border-b [&>tr:last-child]:border-b-0">
          {props.children}
        </tbody>
      </table>
    </div>
  );
}

function Th(props: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={clsx("px-4 py-3 text-left", props.className)}>
      {props.children}
    </th>
  );
}

function Td(props: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={clsx("px-4 py-3", props.className)}>{props.children}</td>
  );
}

function getOwners(team: StaffTeam) {
  return team.staff.members
    .filter((member) => member.level === TeamUserLevel.Owner)
    .map((member) => member.user);
}

function TeamHeader(props: { team: StaffTeam }) {
  const { team } = props;
  const owners = getOwners(team);
  const copyOwnerEmails = useCopyOwnerEmails(owners);
  const trialDialog = useDialogValueState<StaffTrialMode | null>(null);
  const name = team.name || team.slug;

  return (
    <>
      <PageHeader>
        <PageHeaderContent className="flex min-w-0 items-center gap-4">
          <AccountAvatar avatar={team.avatar} className="size-12 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Heading className="truncate">{name}</Heading>
              <StripeCustomerLink stripeCustomerId={team.stripeCustomerId} />
            </div>
            <PageHeaderHeadline>
              {team.slug} · Created{" "}
              <Time date={team.createdAt} format="date" tooltip="title" />
            </PageHeaderHeadline>
          </div>
        </PageHeaderContent>
        <PageHeaderActions className="items-center">
          <Tooltip
            content={copyOwnerEmails ? null : "No owner has an email on file"}
          >
            <Button
              variant="secondary"
              disabled={!copyOwnerEmails}
              onClick={copyOwnerEmails ?? undefined}
            >
              {/* Without their icons, both labels and the menu share one line
                  on a phone instead of pushing the menu onto a line alone. */}
              <ButtonIcon className="max-sm:hidden">
                <MailIcon />
              </ButtonIcon>
              Copy owner emails
            </Button>
          </Tooltip>
          <LinkButton
            variant="secondary"
            href={getAccountURL({ accountSlug: team.slug })}
          >
            <ButtonIcon className="max-sm:hidden">
              <ExternalLinkIcon />
            </ButtonIcon>
            Open in Argos
          </LinkButton>
          <StaffTeamActionsMenu
            team={team}
            owners={owners}
            onTrial={trialDialog.open}
            triggerVariant="secondary"
          />
        </PageHeaderActions>
      </PageHeader>
      {trialDialog.value ? (
        <Modal
          open={trialDialog.isOpen}
          onOpenChange={trialDialog.onOpenChange}
        >
          <StaffTrialDialog
            teamAccountId={team.id}
            teamName={name}
            mode={trialDialog.value}
          />
        </Modal>
      ) : null}
    </>
  );
}

function TeamStats(props: { team: StaffTeam }) {
  const { team } = props;
  const { staff } = team;
  const ownersCount = getOwners(team).length;
  const runningPeriod =
    staff.periodUsage?.billingPeriods.find((period) => !period.closed) ?? null;
  const quotaHint =
    staff.includedScreenshots !== null
      ? `of ${staff.includedScreenshots.toLocaleString()} included`
      : "Not metered";

  return (
    <StatTileGroup className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        icon={ImagesIcon}
        color="primary"
        label="Screenshots this period"
        value={staff.periodUsage?.currentPeriodScreenshotsCount ?? null}
        hint={
          staff.periodUsage ? (
            <span data-visual-test="transparent">
              {quotaHint}
              {runningPeriod
                ? `, ${formatDaysLeft(runningPeriod.endsAt)}`
                : null}
            </span>
          ) : (
            "Not on a usage-based plan"
          )
        }
      />
      <StatTile
        icon={ImagesIcon}
        color="storybook"
        label="Screenshots, last 30 days"
        value={team.last30DaysScreenshots}
        hint={
          team.lastBuildDate ? (
            <>
              Last build <Time date={team.lastBuildDate} />
            </>
          ) : (
            "No build yet"
          )
        }
      />
      <StatTile
        icon={BoxesIcon}
        color="success"
        label="Builds"
        value={staff.buildsCount}
        hint={
          staff.projectsCount === 1
            ? "Across 1 project"
            : `Across ${staff.projectsCount} projects`
        }
      />
      <StatTile
        icon={UsersIcon}
        color="warning"
        label="Members"
        value={staff.members.length}
        hint={ownersCount === 1 ? "1 owner" : `${ownersCount} owners`}
      />
    </StatTileGroup>
  );
}

/**
 * What the plan costs per period. A subscription with no amount on file is
 * priced at the same guess the billing periods below estimate with.
 */
function getPrice(team: StaffTeam): React.ReactNode {
  const { plan, flatPrice } = team.staff;

  if (!plan || !team.subscription) {
    return null;
  }

  const unit = getIntervalUnit(plan.interval);

  if (flatPrice !== null) {
    return `${formatPrice(flatPrice)} / ${unit}`;
  }

  return (
    <span className="text-low">
      {formatPrice(getPeriodFlatPrice(null, plan))} / {unit}, estimated
    </span>
  );
}

function SubscriptionCard(props: { team: StaffTeam }) {
  const { team } = props;
  const { staff, subscription } = team;
  const { plan } = staff;

  return (
    <DetailCard
      title="Subscription"
      items={[
        {
          label: "Status",
          value: <SubscriptionLabel status={team.subscriptionStatus} />,
        },
        {
          label: "Plan",
          value:
            plan &&
            `${plan.displayName}, billed by the ${getIntervalUnit(plan.interval)}`,
        },
        { label: "Provider", value: subscription?.provider },
        { label: "Price", value: getPrice(team) },
        {
          label: "Add-ons",
          value:
            staff.addOns.length > 0 ? (
              staff.addOns
                .map(
                  (addOn) =>
                    `${addOn.label} (${formatPrice(addOn.monthlyPrice)} / month)`,
                )
                .join(", ")
            ) : (
              <span className="text-low">None</span>
            ),
        },
        {
          label: "Included screenshots",
          value:
            staff.includedScreenshots !== null
              ? `${staff.includedScreenshots.toLocaleString()} / period`
              : null,
        },
        {
          label: "Trial ends",
          value: staff.trialEndsAt && (
            <Time date={staff.trialEndsAt} format="date" />
          ),
        },
        {
          label: "Subscription ends",
          value: subscription?.endDate && (
            <Time date={subscription.endDate} format="date" />
          ),
        },
        {
          label: "Payment method",
          value:
            subscription &&
            (subscription.paymentMethodFilled ? (
              "On file"
            ) : (
              <span className="text-low">Missing</span>
            )),
        },
        {
          label: "Stripe customer",
          value: team.stripeCustomerId && (
            <span className="font-mono text-xs">{team.stripeCustomerId}</span>
          ),
        },
      ]}
    />
  );
}

function ActivityCard(props: { team: StaffTeam }) {
  const { team } = props;
  const { staff } = team;
  const storybookRatio = staff.periodUsage?.storybookRatio ?? null;
  const never = <span className="text-low">Never</span>;

  return (
    <DetailCard
      title="Activity"
      items={[
        {
          label: "Created",
          value: <Time date={team.createdAt} format="date" />,
        },
        {
          label: "First comparison",
          value: staff.firstComparisonAt ? (
            <Time date={staff.firstComparisonAt} format="date" />
          ) : (
            never
          ),
        },
        {
          label: "Last build",
          value: team.lastBuildDate ? (
            <Time date={team.lastBuildDate} />
          ) : (
            never
          ),
        },
        {
          label: "Screenshots uploaded",
          value: staff.screenshotsCount.toLocaleString(),
        },
        {
          label: "Storybook share",
          value:
            storybookRatio !== null
              ? `${Math.round(storybookRatio * 100)}%`
              : null,
        },
        {
          label: "Projects",
          value: staff.projectsCount.toLocaleString(),
        },
        {
          label: "Contacted by staff",
          value: staff.contact ? (
            <>
              <Time date={staff.contact.date} format="date" /> by{" "}
              {staff.contact.user.name || staff.contact.user.slug}
            </>
          ) : (
            never
          ),
        },
      ]}
    />
  );
}

function formatPeriod(period: BillingPeriod): string {
  const from = formatDate(new Date(period.from), "date");
  const to = formatDate(
    new Date(period.closed ? period.to : period.endsAt),
    "date",
  );
  return `${from} to ${to}`;
}

function BillingPeriodsSection(props: { team: StaffTeam }) {
  const { team } = props;
  const { staff } = team;
  const { periodUsage, plan } = staff;

  if (!periodUsage || periodUsage.billingPeriods.length === 0) {
    return null;
  }

  // Usage to price means a usage-based plan was resolved to price it against.
  invariant(plan, "a team billed by usage is on a plan");
  // Pro includes the same amount everywhere, so the quota only earns a line on
  // a contract, where it was negotiated.
  const quota = plan.name !== PRO_PLAN_NAME ? staff.includedScreenshots : null;

  return (
    <Section
      title="Billing periods"
      description={`What each period came to, most recent first. Amounts are per ${getIntervalUnit(plan.interval)}, before tax.`}
    >
      <StaffTable
        className="min-w-160"
        head={
          <>
            <Th>Period</Th>
            <Th className="text-right">Screenshots</Th>
            <Th className="text-right">Overage</Th>
            <Th className="text-right">Amount</Th>
          </>
        }
      >
        {periodUsage.billingPeriods.map((period) => (
          <tr key={period.from}>
            <Td>
              <div data-visual-test="transparent">{formatPeriod(period)}</div>
              {period.closed ? null : (
                <div className="text-low text-xs">Running</div>
              )}
            </Td>
            <Td className="text-right tabular-nums">
              {period.screenshotsCount.toLocaleString()}
              {quota !== null ? (
                <div className="text-low text-xs">
                  / {quota.toLocaleString()}
                </div>
              ) : null}
            </Td>
            <Td className="text-right tabular-nums">
              {period.additionalScreenshotsCost > 0 ? (
                formatPrice(period.additionalScreenshotsCost)
              ) : (
                <Dash />
              )}
            </Td>
            <Td className="text-right tabular-nums">
              <div className="font-medium">
                {formatPrice(getPeriodAmount(period, staff, plan))}
              </div>
              <div className="text-low text-xs">
                {period.invoicedAmount !== null ? "Invoiced" : "Estimated"}
              </div>
            </Td>
          </tr>
        ))}
      </StaffTable>
    </Section>
  );
}

function InvoiceLink(props: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={props.label}>
      <LinkButton
        variant="ghost"
        size="small"
        iconOnly
        href={props.href}
        target="_blank"
        aria-label={props.label}
      >
        {props.children}
      </LinkButton>
    </Tooltip>
  );
}

function InvoiceActions(props: { invoice: StaffInvoice }) {
  const { invoice } = props;

  return (
    <div className="flex justify-end gap-1">
      {invoice.hostedUrl ? (
        <InvoiceLink href={invoice.hostedUrl} label="View invoice">
          <FileTextIcon />
        </InvoiceLink>
      ) : null}
      {invoice.pdfUrl ? (
        <InvoiceLink href={invoice.pdfUrl} label="Download PDF">
          <DownloadIcon />
        </InvoiceLink>
      ) : null}
    </div>
  );
}

function InvoiceRow(props: { invoice: StaffInvoice }) {
  const { invoice } = props;
  const status = getInvoiceStatusProps(invoice);

  return (
    <tr>
      <Td className="whitespace-nowrap">
        <Time date={invoice.date} format="date" />
      </Td>
      <Td>
        {invoice.number ? (
          <span className="font-mono text-xs">{invoice.number}</span>
        ) : (
          <Dash />
        )}
      </Td>
      <Td>
        <Chip scale="sm" color={status.color}>
          {status.label}
        </Chip>
      </Td>
      <Td className="text-right tabular-nums">
        <div className="font-medium">
          {formatCurrency(invoice.total, invoice.currency)}
        </div>
        {isPartiallyRefunded(invoice) ? (
          <div className="text-low text-xs">
            {formatCurrency(invoice.refundedAmount, invoice.currency)} refunded
          </div>
        ) : null}
      </Td>
      <Td className="py-2">
        <InvoiceActions invoice={invoice} />
      </Td>
    </tr>
  );
}

function InvoicesSection(props: {
  team: StaffTeam;
  onLoadMore: () => Promise<unknown>;
}) {
  const { invoices } = props.team;
  const { totalCount } = invoices.pageInfo;

  return (
    <Section
      title="Invoices"
      description={
        totalCount > 0
          ? `${totalCount.toLocaleString()} ${totalCount === 1 ? "invoice" : "invoices"} from Stripe, most recent first. Totals include tax.`
          : undefined
      }
    >
      {totalCount === 0 ? (
        <p className="text-low text-sm">No invoice yet.</p>
      ) : (
        <>
          <StaffTable
            className="min-w-160"
            head={
              <>
                <Th>Date</Th>
                <Th>Number</Th>
                <Th>Status</Th>
                <Th className="text-right">Total</Th>
                <Th className="w-24" />
              </>
            }
          >
            {invoices.edges.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </StaffTable>
          {invoices.pageInfo.hasNextPage ? (
            <ListLoadMore onClick={props.onLoadMore} />
          ) : null}
        </>
      )}
    </Section>
  );
}

function ProjectsSection(props: { team: StaffTeam }) {
  const { team } = props;
  const projects = [...team.projects.edges].sort(
    (left, right) =>
      right.buildsCount - left.buildsCount ||
      left.name.localeCompare(right.name),
  );
  const { totalCount } = team.projects.pageInfo;

  return (
    <Section
      title="Projects"
      description={
        totalCount > projects.length
          ? `The ${projects.length} most recently active of ${totalCount}, by builds.`
          : undefined
      }
    >
      {projects.length === 0 ? (
        <p className="text-low text-sm">No projects yet.</p>
      ) : (
        <StaffTable
          head={
            <>
              <Th>Project</Th>
              <Th className="w-32 text-right">Builds</Th>
            </>
          }
        >
          {projects.map((project) => (
            <tr key={project.id}>
              <Td>
                <Link
                  href={getProjectURL({
                    accountSlug: team.slug,
                    projectName: project.name,
                  })}
                  className="font-medium"
                >
                  {project.name}
                </Link>
              </Td>
              <Td className="text-right tabular-nums">
                {project.buildsCount.toLocaleString()}
              </Td>
            </tr>
          ))}
        </StaffTable>
      )}
    </Section>
  );
}

function MemberRow(props: { member: StaffMember }) {
  const { member } = props;
  const { user } = member;

  return (
    <tr>
      <Td>
        <div className="flex min-w-0 items-center gap-3">
          <AccountAvatar avatar={user.avatar} className="size-6 shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-medium">{user.name || user.slug}</div>
            {user.name ? (
              <div className="text-low truncate text-xs">{user.slug}</div>
            ) : null}
          </div>
        </div>
      </Td>
      <Td className="max-w-0 truncate">
        {user.email ? (
          <span title={user.email}>{user.email}</span>
        ) : (
          <span className="text-low">No email</span>
        )}
      </Td>
      <Td>{TeamMemberLabel[member.level]}</Td>
      <Td>
        <Time date={member.joinedAt} format="date" />
      </Td>
      <Td>
        {member.lastSeenAt ? (
          <Time date={member.lastSeenAt} />
        ) : (
          <span className="text-low">Not recorded</span>
        )}
      </Td>
    </tr>
  );
}

function MembersSection(props: { team: StaffTeam }) {
  const { members } = props.team.staff;

  return (
    <Section title="Members" description="Owners first, then by join date.">
      <StaffTable
        className="min-w-200 table-fixed"
        head={
          <>
            <Th className="w-[30%]">Member</Th>
            <Th className="w-[30%]">Email</Th>
            <Th className="w-[12%]">Role</Th>
            <Th className="w-[13%]">Joined</Th>
            <Th className="w-[15%]">
              <Tooltip content="Last use of the web app, to within ten minutes. Recorded since June 2026.">
                <span className="underline decoration-dotted underline-offset-2">
                  Last seen
                </span>
              </Tooltip>
            </Th>
          </>
        }
      >
        {members.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </StaffTable>
    </Section>
  );
}

function StaffTeamPage(props: { slug: string }) {
  const viewer = useAssertAuthAccount();
  const { data, error, fetchMore } = useQuery(StaffTeamQuery, {
    variables: {
      slug: props.slug,
      projectsLimit: PROJECTS_LIMIT,
      invoicesFirst: INITIAL_INVOICES_COUNT,
      isStaff: Boolean(viewer.staff),
    },
  });

  if (error) {
    throw error;
  }

  if (!data) {
    return <PageLoader />;
  }

  const account = data.account;

  if (!account || account.__typename !== "Team") {
    return <NotFound />;
  }

  // `staff` is null for anyone who is not staff, and a member of the team can
  // still read the rest of it.
  if (!account.staff) {
    return (
      <PageContainer>
        <StaffAccessRestricted />
      </PageContainer>
    );
  }

  invariant(account.invoices, "invoices are read for staff");
  const team: StaffTeam = {
    ...account,
    staff: account.staff,
    invoices: account.invoices,
  };

  // The next page comes from a query of its own: refetching the page's would
  // recompute every billing period just to append invoices.
  const loadMoreInvoices = () =>
    fetchMore({
      query: StaffTeamInvoicesQuery,
      variables: {
        slug: props.slug,
        after: team.invoices.edges.length,
        first: INVOICES_PER_PAGE,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!prev.account?.invoices || !fetchMoreResult.account) {
          return prev;
        }
        return {
          ...prev,
          account: {
            ...prev.account,
            invoices: {
              ...fetchMoreResult.account.invoices,
              edges: [
                ...prev.account.invoices.edges,
                ...fetchMoreResult.account.invoices.edges,
              ],
            },
          },
        };
      },
    });

  return (
    <PageContainer>
      <Helmet>
        <title>{team.name || team.slug}</title>
      </Helmet>
      <TeamHeader team={team} />
      <TeamStats team={team} />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SubscriptionCard team={team} />
        <ActivityCard team={team} />
      </div>
      <BillingPeriodsSection team={team} />
      <InvoicesSection team={team} onLoadMore={loadMoreInvoices} />
      <MembersSection team={team} />
      <ProjectsSection team={team} />
    </PageContainer>
  );
}

export function Component() {
  const { teamSlug } = useParams();
  invariant(teamSlug, "the route provides a team slug");

  return (
    <Page>
      <AuthGuard>{() => <StaffTeamPage slug={teamSlug} />}</AuthGuard>
    </Page>
  );
}
