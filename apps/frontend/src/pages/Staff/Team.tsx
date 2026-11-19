import { useQuery } from "@apollo/client/react";
import {
  checkHasSubscriptionStatus,
  checkIsTrialingSubscriptionStatus,
} from "@argos/schemas/subscription-status";
import { diffInCalendarDays } from "@argos/util/date";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  BoxesIcon,
  ExternalLinkIcon,
  HourglassIcon,
  ImagesIcon,
  MailIcon,
  MoreVerticalIcon,
  UsersIcon,
} from "lucide-react";
import { Helmet } from "react-helmet";
import { useParams } from "react-router";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { AuthGuard } from "@/containers/AuthGuard";
import { graphql, type DocumentType } from "@/gql";
import { PlanInterval } from "@/gql/graphql";
import { Alert, AlertText, AlertTitle } from "@/ui/Alert";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
import { Card, CardBody } from "@/ui/Card";
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
import {
  Menu,
  MenuItem,
  MenuItemTooltip,
  MenuRoot,
  MenuTrigger,
} from "@/ui/menu-kit";
import { Modal } from "@/ui/Modal";
import { PageLoader } from "@/ui/PageLoader";
import { StatTile, StatTileGroup } from "@/ui/StatTile";
import { Time } from "@/ui/Time";
import { Tooltip } from "@/ui/Tooltip";

import { getAccountURL } from "../Account/AccountParams";
import { NotFound } from "../NotFound";
import { getProjectURL } from "../Project/ProjectParams";
import { getOwnerEmails, useCopyOwnerEmails } from "./owner-emails";
import { formatPrice, PRO_PLAN_NAME } from "./pricing";
import { StaffTrialDialog, type StaffTrialMode } from "./StaffTrialDialog";
import { StripeCustomerLink } from "./stripe";
import { getPeriodAmount, SubscriptionLabel } from "./team-billing";

/** How many projects the page lists, largest first. */
const PROJECTS_LIMIT = 100;

const StaffTeamQuery = graphql(`
  query StaffTeam_account($slug: String!, $projectsLimit: Int!) {
    account(slug: $slug) {
      id
      ... on Team {
        createdAt
        slug
        name
        stripeCustomerId
        subscriptionStatus
        membersCount
        ownersCount
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
          owners {
            id
            email
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

type AccountNode = NonNullable<DocumentType<typeof StaffTeamQuery>["account"]>;
type TeamNode = Extract<AccountNode, { __typename?: "Team" }>;
type StaffTeam = TeamNode & { staff: NonNullable<TeamNode["staff"]> };
type StaffInfo = StaffTeam["staff"];
type BillingPeriod = NonNullable<
  StaffInfo["periodUsage"]
>["billingPeriods"][number];
type StaffMember = StaffInfo["members"][number];
type StaffProject = StaffTeam["projects"]["edges"][number];

function Dash() {
  return <span className="text-low">-</span>;
}

/** A section of the page: a title, then what it is about. */
function Section(props: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <Heading level={2} className="text-lg font-semibold">
            {props.title}
          </Heading>
          {props.description ? (
            <p className="text-low text-sm">{props.description}</p>
          ) : null}
        </div>
        {props.actions}
      </div>
      {props.children}
    </section>
  );
}

/** Label and value pairs, read down a card. */
function DetailList(props: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-sm">
      {props.items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-low">{item.label}</dt>
          <dd className="min-w-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

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
        <DetailList items={props.items} />
      </CardBody>
    </Card>
  );
}

/** The table frame the staff directory uses, rows striped the same way. */
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

function formatInterval(interval: PlanInterval): string {
  return interval === PlanInterval.Year ? "year" : "month";
}

function StaffTeamActionsMenu(props: {
  team: StaffTeam;
  onTrial: (mode: StaffTrialMode) => void;
}) {
  const { team, onTrial } = props;
  const isTrialing = checkIsTrialingSubscriptionStatus(team.subscriptionStatus);
  // The rule the start mutation enforces: a trial over a live subscription
  // would leave the team with two in Stripe.
  const hasSubscription = checkHasSubscriptionStatus(team.subscriptionStatus);

  return (
    <MenuRoot>
      <MenuTrigger>
        <Button variant="secondary" iconOnly aria-label="Team actions">
          <MoreVerticalIcon />
        </Button>
      </MenuTrigger>
      <Menu aria-label="Team actions">
        {isTrialing ? (
          <MenuItem icon={<HourglassIcon />} onAction={() => onTrial("extend")}>
            Extend trial…
          </MenuItem>
        ) : (
          <MenuItem
            icon={<HourglassIcon />}
            disabled={hasSubscription}
            suffix={
              hasSubscription ? (
                <MenuItemTooltip content="The team already has a subscription" />
              ) : null
            }
            onAction={() => onTrial("start")}
          >
            Start trial…
          </MenuItem>
        )}
      </Menu>
    </MenuRoot>
  );
}

function TeamHeader(props: { team: StaffTeam }) {
  const { team } = props;
  const copyOwnerEmails = useCopyOwnerEmails();
  const ownerEmailsCount = getOwnerEmails(team.staff.owners).length;
  const trialDialog = useDialogValueState<StaffTrialMode | null>(null);
  const name = team.name || team.slug;

  return (
    <>
      <Link
        href="/staff/teams"
        className="text-low mb-4 inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeftIcon className="size-4" />
        All teams
      </Link>
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
            content={
              ownerEmailsCount === 0 ? "No owner has an email on file" : null
            }
          >
            <Button
              variant="secondary"
              disabled={ownerEmailsCount === 0}
              onClick={() => copyOwnerEmails(team.staff.owners)}
            >
              <ButtonIcon>
                <MailIcon />
              </ButtonIcon>
              Copy owner emails
            </Button>
          </Tooltip>
          <LinkButton
            variant="secondary"
            href={getAccountURL({ accountSlug: team.slug })}
          >
            <ButtonIcon>
              <ExternalLinkIcon />
            </ButtonIcon>
            Open in Argos
          </LinkButton>
          <StaffTeamActionsMenu team={team} onTrial={trialDialog.open} />
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
  const runningPeriod =
    staff.periodUsage?.billingPeriods.find((period) => !period.closed) ?? null;
  const daysLeft = runningPeriod
    ? Math.max(
        0,
        diffInCalendarDays(new Date(runningPeriod.endsAt), new Date()),
      )
    : null;
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
              {daysLeft !== null
                ? `, ${daysLeft === 1 ? "1 day" : `${daysLeft} days`} left`
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
        value={team.membersCount}
        hint={team.ownersCount === 1 ? "1 owner" : `${team.ownersCount} owners`}
      />
    </StatTileGroup>
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
          value: plan ? (
            `${plan.displayName}, billed by the ${formatInterval(plan.interval)}`
          ) : (
            <Dash />
          ),
        },
        {
          label: "Provider",
          value: subscription ? subscription.provider : <Dash />,
        },
        {
          label: "Price",
          value:
            plan && staff.flatPrice !== null ? (
              `${formatPrice(staff.flatPrice)} / ${formatInterval(plan.interval)}`
            ) : plan && subscription ? (
              <span className="text-low">Not on file</span>
            ) : (
              <Dash />
            ),
        },
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
            staff.includedScreenshots !== null ? (
              `${staff.includedScreenshots.toLocaleString()} / period`
            ) : (
              <Dash />
            ),
        },
        {
          label: "Trial ends",
          value: staff.trialEndsAt ? (
            <Time date={staff.trialEndsAt} format="date" />
          ) : (
            <Dash />
          ),
        },
        {
          label: "Subscription ends",
          value: subscription?.endDate ? (
            <Time date={subscription.endDate} format="date" />
          ) : (
            <Dash />
          ),
        },
        {
          label: "Payment method",
          value: subscription ? (
            subscription.paymentMethodFilled ? (
              "On file"
            ) : (
              <span className="text-low">Missing</span>
            )
          ) : (
            <Dash />
          ),
        },
        {
          label: "Stripe customer",
          value: team.stripeCustomerId ? (
            <span className="font-mono text-xs">{team.stripeCustomerId}</span>
          ) : (
            <Dash />
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
            <span className="text-low">Never</span>
          ),
        },
        {
          label: "Last build",
          value: team.lastBuildDate ? (
            <Time date={team.lastBuildDate} />
          ) : (
            <span className="text-low">Never</span>
          ),
        },
        {
          label: "Screenshots uploaded",
          value: staff.screenshotsCount.toLocaleString(),
        },
        {
          label: "Storybook share",
          value:
            storybookRatio !== null ? (
              `${Math.round(storybookRatio * 100)}%`
            ) : (
              <Dash />
            ),
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
            <span className="text-low">Never</span>
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
  const showQuota =
    staff.includedScreenshots !== null && plan.name !== PRO_PLAN_NAME;

  return (
    <Section
      title="Billing periods"
      description={`What each period came to, most recent first. Amounts are per ${formatInterval(plan.interval)}, before tax.`}
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
              {showQuota && staff.includedScreenshots !== null ? (
                <div className="text-low text-xs">
                  / {staff.includedScreenshots.toLocaleString()}
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
                {period.invoicedAmount != null ? "Invoiced" : "Estimated"}
              </div>
            </Td>
          </tr>
        ))}
      </StaffTable>
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
          ? `The ${projects.length} first of ${totalCount}, by builds.`
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
          {projects.map((project: StaffProject) => (
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
      <Td className="capitalize">{member.level}</Td>
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
  const { data, error } = useQuery(StaffTeamQuery, {
    variables: { slug: props.slug, projectsLimit: PROJECTS_LIMIT },
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
        <Alert>
          <AlertTitle>Access restricted</AlertTitle>
          <AlertText>This page is only available to staff users.</AlertText>
          <AlertText>
            <Link href="/teams">Go to your teams</Link>
          </AlertText>
        </Alert>
      </PageContainer>
    );
  }

  const team: StaffTeam = { ...account, staff: account.staff };

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
