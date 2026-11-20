import clsx from "clsx";
import { Trash2Icon } from "lucide-react";

import { ProviderMenuButton } from "@/containers/User/ui";
import { DocumentType, graphql } from "@/gql";
import { Chip } from "@/ui/Chip";
import { useDialogValueState } from "@/ui/Dialog";
import { Link } from "@/ui/Link";
import { List, ListHeaderRow, ListRow } from "@/ui/List";
import { Menu, MenuItem, MenuRoot, MenuTrigger } from "@/ui/menu-kit";
import { Modal } from "@/ui/Modal";
import { Time } from "@/ui/Time";

import {
  DeleteWebhookDialog,
  type WebhookDialogValue,
} from "./DeleteWebhookDialog";
import { getDeliveryChip, getProjectsLabel } from "./delivery";
import { formatWebhookEvents } from "./events";

const _WebhookFragment = graphql(`
  fragment WebhookList_Webhook on Webhook {
    id
    url
    events
    allProjects
    createdAt
    projects {
      id
      name
    }
    lastDelivery {
      id
      status
      attempts
      failureReason
      createdAt
    }
  }
`);

type Webhook = DocumentType<typeof _WebhookFragment>;
type WebhookDelivery = NonNullable<Webhook["lastDelivery"]>;

function LastDelivery(props: { delivery: WebhookDelivery | null }) {
  const { delivery } = props;
  if (!delivery) {
    return <span className="text-low text-xs">No event yet</span>;
  }
  const chip = getDeliveryChip(delivery);
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <Chip scale="xs" color={chip.color} className="shrink-0">
        {chip.label}
      </Chip>
      <span
        className="text-low w-full truncate text-xs whitespace-nowrap"
        title={delivery.failureReason ?? undefined}
      >
        <span data-visual-test="transparent">
          <Time date={delivery.createdAt} />
        </span>
        {delivery.failureReason ? ` · ${delivery.failureReason}` : null}
      </span>
    </div>
  );
}

function WebhookActions(props: {
  webhook: Webhook;
  onDelete: (value: WebhookDialogValue) => void;
}) {
  const { webhook, onDelete } = props;
  const label = `${webhook.url} options`;
  return (
    <MenuRoot>
      <MenuTrigger>
        <ProviderMenuButton aria-label={label} />
      </MenuTrigger>
      <Menu aria-label={label}>
        <MenuItem
          icon={<Trash2Icon />}
          variant="danger"
          onAction={() => onDelete({ id: webhook.id, url: webhook.url })}
        >
          Delete
        </MenuItem>
      </Menu>
    </MenuRoot>
  );
}

export function WebhookList(props: { webhooks: Webhook[] }) {
  const { webhooks } = props;
  const deleting = useDialogValueState<WebhookDialogValue | null>(null);
  const columns = "grid-cols-[4fr_2fr_1fr_2rem]";

  return (
    <>
      <List className="min-w-160 rounded-none">
        <ListHeaderRow className={clsx("grid items-center gap-x-6", columns)}>
          <div className="min-w-0">Endpoint</div>
          <div className="min-w-0">Last delivery</div>
          <div className="min-w-0">Created</div>
          <div />
        </ListHeaderRow>
        {webhooks.map((webhook) => (
          <ListRow
            key={webhook.id}
            className={clsx(
              "grid items-center gap-x-6 gap-y-0 px-4 py-1.5 text-sm",
              columns,
            )}
          >
            <div className="min-w-0 py-2">
              <Link
                href={webhook.id}
                variant="neutral"
                className="block truncate font-medium"
                title={webhook.url}
              >
                {webhook.url}
              </Link>
              <div className="text-low mt-0.5 flex flex-col gap-0.5 text-xs">
                <span className="truncate">
                  {formatWebhookEvents(webhook.events)}
                </span>
                <span className="truncate">{getProjectsLabel(webhook)}</span>
              </div>
            </div>
            <div className="min-w-0 py-2">
              <LastDelivery delivery={webhook.lastDelivery} />
            </div>
            <div
              className="text-low min-w-0 truncate py-2 text-xs whitespace-nowrap"
              data-visual-test="transparent"
            >
              <Time date={webhook.createdAt} />
            </div>
            <div>
              <WebhookActions webhook={webhook} onDelete={deleting.open} />
            </div>
          </ListRow>
        ))}
      </List>

      {deleting.value ? (
        <Modal open={deleting.isOpen} onOpenChange={deleting.onOpenChange}>
          <DeleteWebhookDialog {...deleting.value} />
        </Modal>
      ) : null}
    </>
  );
}
