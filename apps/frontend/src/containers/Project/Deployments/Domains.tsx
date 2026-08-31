import { useApolloClient, useMutation } from "@apollo/client/react";
import { assertNever } from "@argos/util/assertNever";
import { SLUG_REGEX } from "@argos/util/slug";
import {
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import { config } from "@/config";
import { TeamSubscribeDialog } from "@/containers/Team/SubscribeDialog";
import { DocumentType, graphql } from "@/gql";
import {
  CustomDomainsAvailability,
  ProjectCustomDomainPendingReason,
  ProjectCustomDomainStatus,
} from "@/gql/graphql";
import { Button, ButtonIcon, LinkButton } from "@/ui/Button";
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
  DialogActionButton,
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

const INTERNAL_DOMAIN_SUFFIX = config.deployments.baseDomain;

const _ProjectFragment = graphql(`
  fragment Domains_Project on Project {
    id
    domain
    customDomainsAvailability
    account {
      id
    }
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

const UpdateInternalDomainMutation = graphql(`
  mutation Domains_updateProjectDomain($input: UpdateProjectDomainInput!) {
    updateProjectDomain(input: $input) {
      id
      domain
    }
  }
`);

const AddCustomDomainMutation = graphql(`
  mutation Domains_addProjectCustomDomain(
    $input: AddProjectCustomDomainInput!
  ) {
    addProjectCustomDomain(input: $input) {
      id
      ...Domains_Project
    }
  }
`);

const CheckCustomDomainMutation = graphql(`
  mutation Domains_checkProjectCustomDomain($input: ProjectCustomDomainInput!) {
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
  mutation Domains_removeProjectCustomDomain(
    $input: ProjectCustomDomainInput!
  ) {
    removeProjectCustomDomain(input: $input) {
      id
      ...Domains_Project
    }
  }
`);

type Project = DocumentType<typeof _ProjectFragment>;
type CustomDomain = Project["customDomains"][number];

export function Domains(props: { project: Project }) {
  const { project } = props;

  return (
    <Card>
      <CardBody>
        <CardTitle>Domains</CardTitle>
        <CardParagraph>
          The domains this project's production deployment is served from. They
          always point at the latest production deployment — preview deployments
          keep their own per-deployment URLs.
        </CardParagraph>
        <List>
          <InternalDomainRow project={project} />
          {project.customDomains.map((customDomain) => (
            <CustomDomainRow
              key={customDomain.id}
              customDomain={customDomain}
            />
          ))}
        </List>
      </CardBody>
      <DomainsCardFooter project={project} />
    </Card>
  );
}

/**
 * The footer carries the one action the viewer can take next: add a domain
 * when custom domains are open to them, or the single thing that would open
 * them when they are not. "Upgrade your plan" is wrong advice for two of the
 * three closed states — a personal account has no plan to upgrade, and a team
 * we put on a plan by hand cannot change it itself — so each state names its
 * own way out.
 */
function DomainsCardFooter(props: { project: Project }) {
  const { project } = props;

  // Installs without a multi-tenant distribution (development, self-hosted)
  // cannot provision custom domains at all — no call to action would help.
  if (!config.deployments.customDomains) {
    return (
      <CardFooter>
        <LearnMore />
      </CardFooter>
    );
  }

  const content = (() => {
    switch (project.customDomainsAvailability) {
      case CustomDomainsAvailability.Available:
        return {
          text: <LearnMore />,
          action: (
            <DialogTrigger>
              <Button variant="secondary">
                <ButtonIcon>
                  <PlusIcon />
                </ButtonIcon>
                Add domain
              </Button>
              <Modal>
                <AddCustomDomainDialog projectId={project.id} />
              </Modal>
            </DialogTrigger>
          ),
        };
      case CustomDomainsAvailability.RequiresTeam:
        return {
          text: "Custom domains are a team feature. Create a team and transfer this project to it to use your own domain.",
          action: (
            <LinkButton variant="secondary" href="/teams/new">
              <ButtonIcon>
                <UsersIcon />
              </ButtonIcon>
              Create team
            </LinkButton>
          ),
        };
      case CustomDomainsAvailability.RequiresSubscription:
        return {
          text: "Custom domains are included in paid plans. Subscribe to serve production deployments from your own domain.",
          action: (
            <TeamSubscribeDialog initialAccountId={project.account.id}>
              Subscribe
            </TeamSubscribeDialog>
          ),
        };
      case CustomDomainsAvailability.RequiresContact:
        return {
          text: "Your plan does not include custom domains. Get in touch and we will sort it out with you.",
          action: (
            <LinkButton
              variant="secondary"
              href={`mailto:${config.contactEmail}`}
            >
              Contact us
            </LinkButton>
          ),
        };
      default:
        assertNever(project.customDomainsAvailability);
    }
  })();

  return (
    <CardFooter className="flex items-center justify-between gap-4">
      <div>{content.text}</div>
      {content.action}
    </CardFooter>
  );
}

function LearnMore() {
  return (
    <>
      Learn more about{" "}
      <Link
        href="https://argos-ci.com/docs/learn/deployments/urls-and-domains"
        target="_blank"
      >
        deployment URLs and domains
      </Link>
      .
    </>
  );
}

function InternalDomainRow(props: { project: Project }) {
  const { project } = props;

  return (
    <ListRow className="flex items-center justify-between gap-4 p-4 text-sm">
      <div className="flex items-center gap-3">
        {project.domain ? (
          <span className="font-medium">{project.domain}</span>
        ) : (
          <span className="text-low">Assigned on first deployment</span>
        )}
        <Chip color="neutral" scale="xs">
          Internal
        </Chip>
      </div>
      <DialogTrigger>
        <Button variant="secondary">
          <ButtonIcon>
            <PencilIcon />
          </ButtonIcon>
          Edit
        </Button>
        <Modal>
          <EditInternalDomainDialog project={project} />
        </Modal>
      </DialogTrigger>
    </ListRow>
  );
}

type InternalDomainInputs = {
  domain: string;
};

function EditInternalDomainDialog(props: { project: Project }) {
  const { project } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  const form = useForm<InternalDomainInputs>({
    defaultValues: {
      domain: getInternalDomainSlug(project.domain),
    },
  });

  const onSubmit: SubmitHandler<InternalDomainInputs> = async (data) => {
    await client.mutate({
      mutation: UpdateInternalDomainMutation,
      variables: {
        input: {
          projectId: project.id,
          domain: `${data.domain}.${INTERNAL_DOMAIN_SUFFIX}`,
        },
      },
    });
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit} noValidate>
        <DialogBody>
          <DialogTitle>Edit internal domain</DialogTitle>
          <DialogText>
            The Argos domain your production deployment is always reachable on.
            Changing it releases the previous name immediately.
          </DialogText>
          <FormTextInput
            control={form.control}
            {...form.register("domain", {
              required: "Please enter a domain slug",
              maxLength: {
                value: 48,
                message: "Domain slugs must be 48 characters or less",
              },
              pattern: {
                value: SLUG_REGEX,
                message:
                  "Domain slugs must be lowercase, start and end with an alphanumeric character, and may contain dashes in the middle.",
              },
            })}
            autoFocus
            label="Internal domain"
            addon={`.${INTERNAL_DOMAIN_SUFFIX}`}
          />
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Save</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

function getInternalDomainSlug(domain: string | null | undefined) {
  if (!domain) {
    return "";
  }
  const suffix = `.${INTERNAL_DOMAIN_SUFFIX}`;
  if (!domain.endsWith(suffix)) {
    return domain;
  }
  return domain.slice(0, -suffix.length);
}

type CustomDomainInputs = {
  domain: string;
};

function AddCustomDomainDialog(props: { projectId: string }) {
  const { projectId } = props;
  const state = useOverlayTriggerState();
  const client = useApolloClient();
  const form = useForm<CustomDomainInputs>({
    defaultValues: { domain: "" },
  });

  const onSubmit: SubmitHandler<CustomDomainInputs> = async (data) => {
    await client.mutate({
      mutation: AddCustomDomainMutation,
      variables: {
        input: { projectId, domain: data.domain.trim() },
      },
    });
    // The new row appears with the DNS record to create — that is the real
    // feedback, so no toast on top of it.
    state.close();
  };

  return (
    <Dialog size="medium">
      <Form form={form} onSubmit={onSubmit} noValidate>
        <DialogBody>
          <DialogTitle>Add custom domain</DialogTitle>
          <DialogText>
            Serve this project's production deployment from a domain you own.
            You will get a DNS record to create, and Argos issues and renews the
            TLS certificate once it points at us.
          </DialogText>
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
            autoFocus
            label="Domain"
            placeholder="docs.example.com"
          />
        </DialogBody>
        <DialogFooter>
          <FormRootError control={form.control} className="flex-1" />
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Add domain</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
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
      {/* Shown on pending rows too, not only failed ones: the reason a domain
          is stuck is most often recorded while it is still pending — a missing
          permission, a CloudFront outage — and rendering it only for `failed`
          left the one message that explains the wait permanently invisible. */}
      {customDomain.statusReason ? (
        <p
          className={
            customDomain.status === ProjectCustomDomainStatus.Failed
              ? "text-danger-low text-xs"
              : "text-low text-xs"
          }
        >
          {customDomain.statusReason}
        </p>
      ) : null}
    </ListRow>
  );
}

/**
 * An apex domain cannot hold a CNAME, so the record type depends on whether the
 * customer gave us a subdomain — getting this wrong is the most common reason a
 * domain never leaves "DNS not configured".
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
  const [removeCustomDomain, { error }] = useMutation(
    RemoveCustomDomainMutation,
    {
      variables: { input: { projectCustomDomainId: customDomain.id } },
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
        <DialogDismiss>Cancel</DialogDismiss>
        <DialogActionButton
          variant="destructive"
          onAsyncAction={async () => {
            try {
              await removeCustomDomain();
              state.close();
              toast.success("Domain removed", { id: "custom-domain-removed" });
            } catch {
              // Surfaced via the mutation's `error` state above.
            }
          }}
        >
          Remove
        </DialogActionButton>
      </DialogFooter>
    </Dialog>
  );
}
