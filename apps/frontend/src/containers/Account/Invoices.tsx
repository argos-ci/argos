import { Suspense } from "react";
import { useSuspenseQuery } from "@apollo/client/react";
import { formatDate } from "@argos/util/date-format";
import { invariant } from "@argos/util/invariant";
import { MoreVerticalIcon } from "lucide-react";

import { DocumentType, graphql } from "@/gql";
import { InvoiceStatus } from "@/gql/graphql";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Chip, ChipColor } from "@/ui/Chip";
import { Details, Summary } from "@/ui/Details";
import { List, ListLoadMore, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Tooltip } from "@/ui/Tooltip";
import { TooltipIndicator } from "@/ui/TooltipIndicator";
import { formatCurrency } from "@/util/intl";

const InvoicesQuery = graphql(`
  query AccountInvoices_account($slug: String!, $after: Int!, $first: Int!) {
    account(slug: $slug) {
      id
      invoices(after: $after, first: $first) {
        pageInfo {
          hasNextPage
        }
        edges {
          id
          number
          date
          total
          currency
          status
          hostedUrl
          pdfUrl
        }
      }
    }
  }
`);

const UpcomingInvoiceQuery = graphql(`
  query AccountInvoices_upcomingInvoice($slug: String!) {
    account(slug: $slug) {
      id
      upcomingInvoice {
        discountAmount
        taxAmount
        total
        currency
        periodStart
        periodEnd
        lines {
          id
          description
          amount
        }
      }
    }
  }
`);

const INITIAL_NB_INVOICES = 20;
const NB_INVOICES_PER_PAGE = 50;

/** The Settings › Invoices section. */
export function AccountInvoices(props: { accountSlug: string }) {
  return (
    <Card>
      <CardBody>
        <CardTitle>Invoices</CardTitle>
        <CardParagraph>
          What you have been billed, and what is coming.
        </CardParagraph>
        {/* Its own boundary: the list is a query of its own, and the settings
            nav must not blank while it loads. */}
        <Suspense fallback={<InvoiceListSkeleton />}>
          <InvoiceList accountSlug={props.accountSlug} />
        </Suspense>
      </CardBody>
    </Card>
  );
}

function InvoiceListSkeleton() {
  return (
    <List>
      <UpcomingInvoiceSkeletonRow />
      <UpcomingInvoiceSkeletonRow />
      <UpcomingInvoiceSkeletonRow />
    </List>
  );
}

function InvoiceList(props: { accountSlug: string }) {
  const { accountSlug } = props;
  const { data, fetchMore } = useSuspenseQuery(InvoicesQuery, {
    variables: { slug: accountSlug, after: 0, first: INITIAL_NB_INVOICES },
  });

  // The settings page resolved this account before rendering the section.
  invariant(data.account, "account is required");

  const { invoices } = data.account;

  return (
    <>
      <List>
        {/* The invoice to come is one row of the same list, but it is read from
            Stripe rather than from the mirror — so it gets its own boundary and
            the billed history renders without waiting for it. */}
        <Suspense fallback={<UpcomingInvoiceSkeletonRow />}>
          <UpcomingInvoiceRow accountSlug={accountSlug} />
        </Suspense>
        {invoices.edges.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))}
        {invoices.edges.length === 0 ? (
          <ListRow className="text-low p-4 text-sm">
            No invoice has been raised on this account yet.
          </ListRow>
        ) : null}
      </List>
      {invoices.pageInfo.hasNextPage ? (
        <ListLoadMore
          onClick={() => {
            fetchMore({
              variables: {
                after: invoices.edges.length,
                first: NB_INVOICES_PER_PAGE,
              },
              updateQuery: (prev, { fetchMoreResult }) => {
                if (!fetchMoreResult?.account || !prev.account) {
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
          }}
        />
      ) : null}
    </>
  );
}

/**
 * The shape every row on this page takes: what the invoice is, what it comes
 * to, when it was raised, and what can be done with it.
 */
function InvoiceRowLayout(props: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  amountLabel: React.ReactNode;
  amount: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <ListRow className="p-4">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-medium">
            {props.title}
          </div>
          <div className="text-low mt-0.5 truncate text-sm">
            {props.subtitle}
          </div>
        </div>
        <div className="w-32 shrink-0">
          <div className="text-low text-sm">{props.amountLabel}</div>
          <div className="mt-0.5 font-medium tabular-nums">{props.amount}</div>
        </div>
        <div className="text-low hidden w-40 shrink-0 text-sm sm:block">
          {props.meta}
        </div>
        {/* Held open even when there is no menu, so the columns of every row
            line up. */}
        <div className="w-8 shrink-0">{props.actions}</div>
      </div>
      {props.children}
    </ListRow>
  );
}

function UpcomingInvoiceSkeletonRow() {
  return (
    <ListRow className="p-4">
      <div className="flex animate-pulse items-center gap-4" aria-hidden="true">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="bg-ui h-4 w-40 rounded" />
          <div className="bg-ui h-3 w-56 rounded" />
        </div>
        <div className="w-32 shrink-0 space-y-2">
          <div className="bg-ui h-3 w-24 rounded" />
          <div className="bg-ui h-4 w-16 rounded" />
        </div>
        <div className="hidden w-40 shrink-0 sm:block" />
        <div className="w-8 shrink-0" />
      </div>
    </ListRow>
  );
}

function UpcomingInvoiceRow(props: { accountSlug: string }) {
  const { data, error } = useSuspenseQuery(UpcomingInvoiceQuery, {
    variables: { slug: props.accountSlug },
    // Stripe answering badly must not take the page down with it: the error
    // comes back beside the data so this row alone can report it.
    errorPolicy: "all",
    fetchPolicy: "cache-and-network",
  });

  if (error) {
    return (
      <ListRow className="text-low p-4 text-sm">
        We could not reach Stripe to preview your next invoice. Try again in a
        moment.
      </ListRow>
    );
  }

  const upcomingInvoice = data?.account?.upcomingInvoice;

  // No invoice to come is a normal state — a subscription ending, a trial with
  // no card on file, a team GitHub bills — and one the history below answers on
  // its own. A row saying nothing is coming would only push it down.
  if (!upcomingInvoice) {
    return null;
  }

  const { currency, lines } = upcomingInvoice;

  return (
    <InvoiceRowLayout
      title={
        <>
          Upcoming invoice
          <Chip scale="sm" color="info">
            Upcoming
          </Chip>
        </>
      }
      subtitle={
        <>
          {formatDate(new Date(upcomingInvoice.periodStart), "monthDay")} –{" "}
          {formatDate(new Date(upcomingInvoice.periodEnd), "date")}
        </>
      }
      amountLabel={
        <Tooltip content="What this period has run up so far. Usage keeps accruing until it closes, so the invoice can land higher.">
          <span>
            Estimated total
            <TooltipIndicator />
          </span>
        </Tooltip>
      }
      amount={formatCurrency(upcomingInvoice.total, currency)}
    >
      {lines.length > 0 ? (
        <Details className="mt-3 text-sm">
          <Summary>Show breakdown</Summary>
          <dl className="divide-y-thin border-thin rounded-lg">
            {lines.map((line) => (
              <AmountRow key={line.id} label={line.description}>
                {formatCurrency(line.amount, currency)}
              </AmountRow>
            ))}
            {upcomingInvoice.discountAmount > 0 ? (
              <AmountRow label="Discount">
                −{formatCurrency(upcomingInvoice.discountAmount, currency)}
              </AmountRow>
            ) : null}
            {upcomingInvoice.taxAmount > 0 ? (
              <AmountRow label="Tax">
                {formatCurrency(upcomingInvoice.taxAmount, currency)}
              </AmountRow>
            ) : null}
            <AmountRow label="Total" strong>
              {formatCurrency(upcomingInvoice.total, currency)}
            </AmountRow>
          </dl>
        </Details>
      ) : null}
    </InvoiceRowLayout>
  );
}

function AmountRow(props: {
  label: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3">
      <dt className={props.strong ? "font-medium" : "text-low"}>
        {props.label}
      </dt>
      <dd
        className={props.strong ? "font-medium tabular-nums" : "tabular-nums"}
      >
        {props.children}
      </dd>
    </div>
  );
}

type Invoice = NonNullable<
  DocumentType<typeof InvoicesQuery>["account"]
>["invoices"]["edges"][number];

const INVOICE_STATUS_PROPS: Record<
  InvoiceStatus,
  { label: string; color: ChipColor }
> = {
  [InvoiceStatus.Paid]: { label: "Paid", color: "success" },
  [InvoiceStatus.Open]: { label: "Due", color: "warning" },
  [InvoiceStatus.Void]: { label: "Void", color: "neutral" },
  [InvoiceStatus.Uncollectible]: { label: "Uncollectible", color: "danger" },
};

function InvoiceRow(props: { invoice: Invoice }) {
  const { invoice } = props;
  const status = INVOICE_STATUS_PROPS[invoice.status];
  const date = new Date(invoice.date);

  return (
    <InvoiceRowLayout
      title={
        <>
          {formatDate(date, "monthYear")}
          <Chip scale="sm" color={status.color}>
            {status.label}
          </Chip>
        </>
      }
      // The number is what a customer quotes to their accounting, and the only
      // thing telling two invoices of the same month apart.
      subtitle={invoice.number ?? "Argos subscription"}
      amountLabel="Total"
      amount={formatCurrency(invoice.total, invoice.currency)}
      meta={`Invoiced ${formatDate(date, "date")}`}
      actions={<InvoiceMenu invoice={invoice} />}
    />
  );
}

function InvoiceMenu(props: { invoice: Invoice }) {
  const { invoice } = props;

  if (!invoice.hostedUrl && !invoice.pdfUrl) {
    return null;
  }

  const label = invoice.number
    ? `Invoice ${invoice.number} actions`
    : "Invoice actions";

  return (
    <MenuRoot>
      <MenuTrigger>
        <Button variant="ghost" size="small" iconOnly aria-label={label}>
          <MoreVerticalIcon />
        </Button>
      </MenuTrigger>
      {/* Two links need no filter field; typing still summons one. */}
      <Menu aria-label={label} search={false}>
        {invoice.hostedUrl ? (
          <MenuItem href={invoice.hostedUrl} target="_blank">
            View invoice
          </MenuItem>
        ) : null}
        {invoice.pdfUrl ? (
          <MenuItem href={invoice.pdfUrl} target="_blank">
            Download PDF
          </MenuItem>
        ) : null}
      </Menu>
    </MenuRoot>
  );
}
