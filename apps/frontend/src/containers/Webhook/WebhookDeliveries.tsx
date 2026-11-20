import { useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { ArrowLeftIcon, RotateCwIcon, SearchIcon } from "lucide-react";
import {
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "nuqs";

import { graphql } from "@/gql";
import { WebhookDeliveryStatus } from "@/gql/graphql";
import { NotFound } from "@/pages/NotFound";
import { Button, ButtonIcon } from "@/ui/Button";
import { Card, CardBody, CardParagraph, CardTitle } from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Link } from "@/ui/Link";
import { List, ListEmpty, ListLoadMore, ListRowButton } from "@/ui/List";
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { PageLoader } from "@/ui/PageLoader";
import { Pre } from "@/ui/Pre";
import { Select, SelectButton, SelectValue } from "@/ui/Select";
import { TextInput, TextInputGroup, TextInputIcon } from "@/ui/TextInput";
import { Time } from "@/ui/Time";
import { toast } from "@/ui/Toaster";
import { checkAreDefaultValues } from "@/util/search-params";

import { getDeliveryChip, getProjectsLabel } from "./delivery";
import { formatWebhookEvents } from "./events";

const PAGE_SIZE = 30;

const DeliveriesQuery = graphql(`
  query WebhookDeliveries_deliveries(
    $accountSlug: String!
    $webhookId: ID!
    $first: Int!
    $status: WebhookDeliveryStatus
    $eventId: ID
  ) {
    account(slug: $accountSlug) {
      id
      webhook(id: $webhookId) {
        id
        url
        events
        allProjects
        projects {
          id
          name
        }
        deliveries(
          first: $first
          after: 0
          status: $status
          eventId: $eventId
        ) {
          pageInfo {
            hasNextPage
          }
          edges {
            id
            status
            attempts
            responseStatus
            createdAt
            event {
              id
              type
            }
          }
        }
      }
    }
  }
`);

const DeliveryQuery = graphql(`
  query WebhookDeliveries_delivery(
    $accountSlug: String!
    $webhookId: ID!
    $deliveryId: ID!
  ) {
    account(slug: $accountSlug) {
      id
      webhook(id: $webhookId) {
        id
        delivery(id: $deliveryId) {
          id
          status
          attempts
          attemptedAt
          responseStatus
          durationMs
          responseBody
          failureReason
          event {
            id
            type
            timestamp
            body
          }
        }
      }
    }
  }
`);

const ResendMutation = graphql(`
  mutation WebhookDeliveries_resend($input: ResendWebhookDeliveryInput!) {
    resendWebhookDelivery(input: $input) {
      id
    }
  }
`);

const STATUS_FILTERS = {
  all: "All statuses",
  [WebhookDeliveryStatus.Failed]: "Failed",
  [WebhookDeliveryStatus.Pending]: "Pending",
  [WebhookDeliveryStatus.Success]: "Delivered",
} as const;

const filtersSchema = {
  status: parseAsStringEnum(Object.values(WebhookDeliveryStatus)),
  eventId: parseAsString,
};

/**
 * Whether the status code alone says what went wrong. A missing response or a
 * redirect needs the failure reason to explain it.
 */
function checkIsErrorStatus(delivery: { responseStatus: number | null }) {
  return delivery.responseStatus !== null && delivery.responseStatus >= 400;
}

function formatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

/**
 * The deliveries of one webhook: filter them, look into an attempt, resend it.
 */
export function WebhookDeliveries(props: {
  accountSlug: string;
  webhookId: string;
}) {
  const { accountSlug, webhookId } = props;
  const [filters, setFilters] = useQueryStates(filtersSchema);
  const [selectedParam, setSelected] = useQueryState("delivery", parseAsString);
  const [first, setFirst] = useState(PAGE_SIZE);

  const { data, previousData, refetch } = useQuery(DeliveriesQuery, {
    variables: { accountSlug, webhookId, first, ...filters },
  });
  const account = (data ?? previousData)?.account;

  if (!account) {
    return <PageLoader />;
  }
  const { webhook } = account;
  if (!webhook) {
    return <NotFound />;
  }

  const deliveries = webhook.deliveries.edges;
  const selectedId = selectedParam ?? deliveries[0]?.id ?? null;

  return (
    <Card>
      <CardBody>
        <Link
          href=".."
          variant="neutral"
          className="text-low mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Webhooks
        </Link>
        <CardTitle className="break-all">{webhook.url}</CardTitle>
        <CardParagraph>
          {formatWebhookEvents(webhook.events)} · {getProjectsLabel(webhook)}
        </CardParagraph>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <form
            className="min-w-48 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              const value = new FormData(event.currentTarget).get("eventId");
              void setFilters({
                eventId:
                  typeof value === "string" ? value.trim() || null : null,
              });
              void setSelected(null);
            }}
          >
            <TextInputGroup>
              <TextInputIcon>
                <SearchIcon />
              </TextInputIcon>
              <TextInput
                key={filters.eventId}
                type="search"
                name="eventId"
                defaultValue={filters.eventId ?? ""}
                placeholder="Find by event ID…"
                aria-label="Event ID"
              />
            </TextInputGroup>
          </form>
          <Select
            aria-label="Status"
            items={STATUS_FILTERS}
            value={filters.status ?? "all"}
            onValueChange={(value) => {
              // "all" parses to no filter.
              void setFilters({
                status: filtersSchema.status.parse(String(value)),
              });
              void setSelected(null);
            }}
          >
            <SelectButton className="text-sm">
              <SelectValue />
            </SelectButton>
            <ListBox>
              {Object.entries(STATUS_FILTERS).map(([value, label]) => (
                <ListBoxItem key={value} value={value}>
                  {label}
                </ListBoxItem>
              ))}
            </ListBox>
          </Select>
          <Button
            variant="secondary"
            onAsyncAction={async () => {
              await refetch();
            }}
          >
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0">
            {deliveries.length === 0 ? (
              <ListEmpty className="text-low">
                {checkAreDefaultValues(filtersSchema, filters)
                  ? "No delivery yet. Deliveries are kept 7 days."
                  : "No delivery matches these filters."}
              </ListEmpty>
            ) : (
              <List>
                {deliveries.map((delivery) => {
                  const chip = getDeliveryChip(delivery);
                  return (
                    <ListRowButton
                      key={delivery.id}
                      aria-current={delivery.id === selectedId}
                      onClick={() => void setSelected(delivery.id)}
                      className="aria-[current=true]:bg-primary-subtle flex items-center gap-3 px-3 py-2 text-left text-sm"
                    >
                      <Chip scale="xs" color={chip.color} className="shrink-0">
                        {delivery.responseStatus ?? chip.label}
                      </Chip>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">
                        {formatWebhookEvents([delivery.event.type])}
                      </span>
                      <Time
                        date={delivery.createdAt}
                        className="text-low shrink-0 text-xs"
                      />
                    </ListRowButton>
                  );
                })}
              </List>
            )}
            {webhook.deliveries.pageInfo.hasNextPage && (
              <ListLoadMore onClick={() => setFirst((n) => n + PAGE_SIZE)} />
            )}
          </div>
          <div className="min-w-0">
            {selectedId && (
              <DeliveryDetail
                accountSlug={accountSlug}
                webhookId={webhookId}
                deliveryId={selectedId}
                onResent={async (id) => {
                  // The new delivery is pending: a status filter would hide it.
                  // Refetched with the filter's next value, so the list loads
                  // once.
                  await refetch({ status: null });
                  await setFilters({ status: null });
                  await setSelected(id);
                }}
              />
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function DetailRow(props: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-low">{props.label}</dt>
      <dd className="min-w-0 break-all">{props.children}</dd>
    </>
  );
}

function DeliveryDetail(props: {
  accountSlug: string;
  webhookId: string;
  deliveryId: string;
  onResent: (deliveryId: string) => Promise<void>;
}) {
  const { accountSlug, webhookId, deliveryId, onResent } = props;
  const client = useApolloClient();
  const { data } = useQuery(DeliveryQuery, {
    variables: { accountSlug, webhookId, deliveryId },
  });
  const delivery = data?.account?.webhook?.delivery;
  if (!data) {
    return <PageLoader />;
  }
  if (!delivery) {
    return <p className="text-low text-sm">Delivery not found.</p>;
  }
  const chip = getDeliveryChip(delivery);

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-low text-xs font-medium">Delivery</div>
          <div className="truncate font-mono font-medium">
            {formatWebhookEvents([delivery.event.type])}
          </div>
        </div>
        <Button
          variant="secondary"
          onAsyncAction={async () => {
            const result = await client.mutate({
              mutation: ResendMutation,
              variables: { input: { id: delivery.id } },
            });
            invariant(result.data, "Delivery not resent");
            toast.success("Delivery resent", { id: "webhook-delivery-resent" });
            await onResent(result.data.resendWebhookDelivery.id);
          }}
        >
          <ButtonIcon>
            <RotateCwIcon />
          </ButtonIcon>
          Resend
        </Button>
      </div>

      <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-1.5">
        <DetailRow label="Status">
          <Chip scale="xs" color={chip.color}>
            {chip.label}
          </Chip>
        </DetailRow>
        <DetailRow label="Attempts">{delivery.attempts}</DetailRow>
        <DetailRow label="Attempt date">
          {delivery.attemptedAt ? (
            <Time date={delivery.attemptedAt} format="dateTime" />
          ) : (
            "Not attempted yet"
          )}
        </DetailRow>
        {delivery.durationMs !== null && (
          <DetailRow label="Duration">{delivery.durationMs} ms</DetailRow>
        )}
        <DetailRow label="Event ID">
          <span className="font-mono">{delivery.event.id}</span>
        </DetailRow>
        <DetailRow label="Event date">
          <Time date={delivery.event.timestamp} format="dateTime" />
        </DetailRow>
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Response</h3>
        {delivery.responseStatus !== null && (
          <p>HTTP status code {delivery.responseStatus}</p>
        )}
        {delivery.failureReason && !checkIsErrorStatus(delivery) && (
          <p className="text-danger-low">{delivery.failureReason}</p>
        )}
        {delivery.responseBody ? (
          <div className="max-h-64 overflow-auto rounded-lg">
            <Pre code={formatJson(delivery.responseBody)} className="text-xs" />
          </div>
        ) : (
          <p className="text-low">
            {delivery.attemptedAt ? "Empty body." : "Not sent yet."}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Request</h3>
        <div className="max-h-96 overflow-auto rounded-lg">
          <Pre code={formatJson(delivery.event.body)} className="text-xs" />
        </div>
      </section>
    </div>
  );
}
