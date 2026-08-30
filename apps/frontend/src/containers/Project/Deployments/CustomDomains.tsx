import { useApolloClient, useMutation } from "@apollo/client/react";
import { PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { DocumentType, graphql } from "@/gql";
import {
  ProjectCustomDomainPendingReason,
  ProjectCustomDomainStatus,
} from "@/gql/graphql";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Chip } from "@/ui/Chip";
import { Code } from "@/ui/Code";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  DialogTrigger,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Link } from "@/ui/Link";
import { List, ListRow } from "@/ui/List";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toaster";

const _ProjectFragment = graphql(`
  fragment CustomDomains_Project on Project {
    id
    customDomainsEnabled
    customDomains {
      id
      domain
      status
      pendingReason
      routingEndpoint
      statusReason
    }
  }
`);

const AddCustomDomainMutation = graphql(`
  mutation CustomDomains_addProjectCustomDomain(
    $input: AddProjectCustomDomainInput!
  ) {
    addProjectCustomDomain(input: $input) {
      id
      ...CustomDomains_Project
    }
  }
`);

const CheckCustomDomainMutation = graphql(`
  mutation CustomDomains_checkProjectCustomDomain(
    $input: ProjectCustomDomainInput!
  ) {
    checkProjectCustomDomain(input: $input) {
      id
      domain
      status
      pendingReason
      routingEndpoint
      statusReason
    }
  }
`);

const RemoveCustomDomainMutation = graphql(`
  mutation CustomDomains_removeProjectCustomDomain(
    $input: ProjectCustomDomainInput!
  ) {
    removeProjectCustomDomain(input: $input) {
      id
      ...CustomDomains_Project
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;
type CustomDomain = Project["customDomains"][number];

type Inputs = {
  domain: string;
};

export function CustomDomains(props: { project: Project }) {
  const { project } = props;
  const client = useApolloClient();
  const form = useForm<Inputs>({ defaultValues: { domain: "" } });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await client.mutate({
      mutation: AddCustomDomainMutation,
      variables: {
        input: { projectId: project.id, domain: data.domain.trim() },
      },
    });
    form.reset({ domain: "" });
  };

  if (!project.customDomainsEnabled) {
    return <CustomDomainsUpgradeCard />;
  }

  return (
    <Card>
      <Form form={form} onSubmit={onSubmit} noValidate>
        <CardBody>
          <CardTitle>Custom domains</CardTitle>
          <CardParagraph>
            Serve this project's production deployments from your own domain.
          </CardParagraph>
          {project.customDomains.length > 0 ? (
            <List className="mb-4">
              {project.customDomains.map((customDomain) => (
                <CustomDomainRow
                  key={customDomain.id}
                  customDomain={customDomain}
                />
              ))}
            </List>
          ) : (
            <p className="text-low mb-4 text-sm">No custom domains yet.</p>
          )}
          <FormTextInput
            control={form.control}
            {...form.register("domain", {
              validate: (value) => {
                const domain = value.trim();
                if (!domain) {
                  return "Domain is required";
                }
                if (domain.includes("/") || domain.includes(":")) {
                  return "Enter a domain, not a URL";
                }
                if (!domain.includes(".")) {
                  return "Enter a fully qualified domain, like docs.example.com";
                }
                return true;
              },
            })}
            label="Domain"
            placeholder="docs.example.com"
            className="max-w-md"
          />
        </CardBody>
        <CardFooter className="flex items-center justify-between gap-4">
          <div>
            Argos issues and renews the TLS certificate once your DNS record
            points at it.
          </div>
          <div className="flex items-center justify-end gap-4">
            <FormRootError control={form.control} />
            <FormSubmit control={form.control} disableIfPristine>
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
              Add domain
            </FormSubmit>
          </div>
        </CardFooter>
      </Form>
    </Card>
  );
}

function CustomDomainsUpgradeCard() {
  return (
    <Card>
      <CardBody>
        <CardTitle>Custom domains</CardTitle>
        <CardParagraph>
          Serve this project's production deployments from your own domain.
          Custom domains are available on paid plans.
        </CardParagraph>
      </CardBody>
      <CardFooter>
        Learn more about{" "}
        <Link
          href="https://argos-ci.com/docs/learn/deployments/urls-and-domains"
          target="_blank"
        >
          deployment URLs and domains
        </Link>
        .
      </CardFooter>
    </Card>
  );
}

const STATUS_LABELS: Record<
  ProjectCustomDomainStatus,
  { label: string; color: "success" | "pending" | "danger" }
> = {
  [ProjectCustomDomainStatus.Active]: { label: "Active", color: "success" },
  [ProjectCustomDomainStatus.Pending]: {
    label: "Pending",
    color: "pending",
  },
  [ProjectCustomDomainStatus.Failed]: { label: "Failed", color: "danger" },
};

const PENDING_LABELS: Record<ProjectCustomDomainPendingReason, string> = {
  [ProjectCustomDomainPendingReason.Dns]: "DNS not configured",
  [ProjectCustomDomainPendingReason.Certificate]: "Issuing certificate",
};

function CustomDomainRow(props: { customDomain: CustomDomain }) {
  const { customDomain } = props;
  const status = STATUS_LABELS[customDomain.status];
  // Only the DNS record is the customer's to act on; while the certificate is
  // issuing there is nothing for them to do, so the instructions come down.
  const isAwaitingDns =
    customDomain.pendingReason === ProjectCustomDomainPendingReason.Dns;

  return (
    <ListRow className="flex flex-col items-stretch gap-2 p-4 text-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-medium">{customDomain.domain}</span>
          <Chip color={status.color} scale="xs">
            {customDomain.pendingReason
              ? PENDING_LABELS[customDomain.pendingReason]
              : status.label}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <CheckCustomDomainButton customDomain={customDomain} />
          <DialogTrigger>
            <Button
              variant="danger"
              iconOnly
              aria-label={`Remove ${customDomain.domain}`}
            >
              <Trash2Icon />
            </Button>
            <Modal>
              <RemoveCustomDomainDialog customDomain={customDomain} />
            </Modal>
          </DialogTrigger>
        </div>
      </div>
      {isAwaitingDns && customDomain.routingEndpoint ? (
        <DnsInstructions
          domain={customDomain.domain}
          routingEndpoint={customDomain.routingEndpoint}
        />
      ) : null}
      {customDomain.status === ProjectCustomDomainStatus.Failed &&
      customDomain.statusReason ? (
        <p className="text-danger-low text-xs">{customDomain.statusReason}</p>
      ) : null}
    </ListRow>
  );
}

/**
 * An apex domain cannot hold a CNAME, so the record type depends on whether the
 * customer gave us a subdomain — getting this wrong is the most common reason a
 * domain never leaves "Pending DNS".
 */
function DnsInstructions(props: { domain: string; routingEndpoint: string }) {
  const { domain, routingEndpoint } = props;
  const isApex = domain.split(".").length <= 2;

  return (
    <div className="bg-subtle rounded-sm p-3">
      <p className="text-low mb-2 text-xs">
        Add this record with your DNS provider. Argos issues the certificate
        automatically once it resolves.
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span>
          <span className="text-low">Type </span>
          <Code>{isApex ? "ALIAS / A" : "CNAME"}</Code>
        </span>
        <span>
          <span className="text-low">Name </span>
          <Code>{domain}</Code>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-low">Value </span>
          <Code>{routingEndpoint}</Code>
          <CopyButton text={routingEndpoint} aria-label="Copy DNS target" />
        </span>
      </div>
      {isApex ? (
        <p className="text-low mt-2 text-xs">
          Most providers cannot put a CNAME on a root domain. Use an ALIAS or
          ANAME record, or point a subdomain here instead.
        </p>
      ) : null}
    </div>
  );
}

function CheckCustomDomainButton(props: { customDomain: CustomDomain }) {
  const { customDomain } = props;
  const [checkCustomDomain, { loading }] = useMutation(
    CheckCustomDomainMutation,
    {
      variables: { input: { projectCustomDomainId: customDomain.id } },
      onCompleted: (data) => {
        const isActive =
          data.checkProjectCustomDomain.status ===
          ProjectCustomDomainStatus.Active;
        if (isActive) {
          toast.success("Domain is live", { id: "custom-domain-active" });
        } else {
          // Name the step that is actually blocking. "Waiting on DNS" sent
          // people to re-check a record that was already correct; a generic
          // "provisioning" hid that the record was never created.
          toast.info(
            data.checkProjectCustomDomain.pendingReason ===
              ProjectCustomDomainPendingReason.Dns
              ? "DNS record not found yet"
              : "DNS is set — waiting on the certificate",
            { id: "custom-domain-pending" },
          );
        }
      },
    },
  );

  if (customDomain.status === ProjectCustomDomainStatus.Active) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      pending={loading}
      onClick={() => {
        checkCustomDomain().catch(() => {
          // Surfaced by the toast below; a failed check is retryable.
          toast.error("Could not check the domain", {
            id: "custom-domain-check-error",
          });
        });
      }}
    >
      <ButtonIcon>
        <RefreshCwIcon />
      </ButtonIcon>
      Check
    </Button>
  );
}

function RemoveCustomDomainDialog(props: { customDomain: CustomDomain }) {
  const { customDomain } = props;
  const state = useOverlayTriggerState();
  const [removeCustomDomain, { loading, error }] = useMutation(
    RemoveCustomDomainMutation,
    {
      variables: { input: { projectCustomDomainId: customDomain.id } },
      onCompleted: () => {
        state.close();
        toast.success("Domain removed", { id: "custom-domain-removed" });
      },
    },
  );

  return (
    <Dialog size="medium" role="alertdialog">
      <DialogBody>
        <DialogTitle>Remove custom domain</DialogTitle>
        <DialogText>
          <strong>{customDomain.domain}</strong> will stop serving this
          project's production deployments immediately, and its TLS certificate
          will no longer be renewed. You can remove the DNS record afterwards.
        </DialogText>
      </DialogBody>
      <DialogFooter>
        {error ? (
          <ErrorMessage className="flex-1">{error.message}</ErrorMessage>
        ) : null}
        <DialogDismiss disabled={loading}>Cancel</DialogDismiss>
        <Button
          variant="destructive"
          pending={loading}
          onClick={() => {
            removeCustomDomain().catch(() => {
              // The error is shown in the dialog.
            });
          }}
        >
          Remove
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
