/* eslint-disable react-hooks/refs */
import { useId } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  CheckCircle2Icon,
  CircleSlashIcon,
  LockIcon,
  MoreVerticalIcon,
} from "lucide-react";
import { MenuTrigger } from "react-aria-components";
import {
  useController,
  useForm,
  useFormState,
  type Control,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { CONTACT_HREF } from "@/constants";
import { DocumentType, graphql } from "@/gql";
import { Button, LinkButton } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { CopyButton } from "@/ui/CopyButton";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Dropzone, type DropzoneProps } from "@/ui/Dropzone";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Form } from "@/ui/Form";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { IconButton } from "@/ui/IconButton";
import { Label } from "@/ui/Label";
import { Menu, MenuItem } from "@/ui/Menu";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Separator } from "@/ui/Separator";
import { Switch } from "@/ui/Switch";
import { TextInput, TextInputAddon, TextInputGroup } from "@/ui/TextInput";
import { Tooltip } from "@/ui/Tooltip";
import { useEventCallback } from "@/ui/useEventCallback";
import { getErrorMessage } from "@/util/error";

const _TeamFragment = graphql(`
  fragment TeamSAMLSSO_Team on Team {
    id
    slug
    plan {
      id
      displayName
      samlIncluded
    }
    samlSpEntityId
    samlAcsUrl
    samlMetadataUrl
    samlSsoUrl
    samlSso {
      id
      idpEntityId
      ssoUrl
      signingCertificate
      enabled
      enforced
    }
    me {
      id
      lastAuthMethod
    }
  }
`);

const ConfigureTeamSamlMutation = graphql(`
  mutation TeamSAMLSSO_configure($input: ConfigureTeamSamlInput!) {
    configureTeamSaml(input: $input) {
      id
      idpEntityId
      ssoUrl
      signingCertificate
      enabled
      enforced
    }
  }
`);

const RemoveTeamSamlMutation = graphql(`
  mutation TeamSAMLSSO_remove($teamAccountId: ID!) {
    removeTeamSaml(teamAccountId: $teamAccountId) {
      id
      samlSso {
        id
      }
    }
  }
`);

const ImportTeamSamlMetadataMutation = graphql(`
  mutation TeamSAMLSSO_import($teamAccountId: ID!, $metadataXml: String!) {
    importTeamSamlMetadata(
      input: { teamAccountId: $teamAccountId, metadataXml: $metadataXml }
    ) {
      idpEntityId
      ssoUrl
      signingCertificate
    }
  }
`);

type Inputs = {
  idpEntityId: string;
  ssoUrl: string;
  signingCertificate: string;
};

export function TeamSAMLSSO(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const hasSamlIncluded = team.plan?.samlIncluded;
  const [update] = useMutation(ConfigureTeamSamlMutation);
  const toggleEnable = (enabled: boolean) => {
    invariant(team.samlSso);
    update({
      variables: {
        input: {
          teamAccountId: team.id,
          enabled,
        },
      },
      optimisticResponse: {
        configureTeamSaml: {
          __typename: "TeamSamlConfig",
          ...team.samlSso,
          enabled,
        },
      },
    });
  };
  const [remove] = useMutation(RemoveTeamSamlMutation, {
    variables: {
      teamAccountId: team.id,
    },
    optimisticResponse: {
      removeTeamSaml: {
        __typename: "Team",
        id: team.id,
        samlSso: null,
      },
    },
  });

  return (
    <Card>
      <CardBody>
        <CardTitle>SAML Single Sign-On</CardTitle>
        <CardParagraph>
          Customize SAML authentication for your team and enforce SSO access
          policies.
        </CardParagraph>
        {team.samlSso ? (
          <div className="rounded-sm border text-sm">
            <div className="flex items-center gap-4 p-4">
              <LockIcon className="size-6 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">SAML Enabled</div>
                <p className="text-low">
                  Manage the configuration with your Identity Provider.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <DialogTrigger>
                  <Button variant="secondary" isDisabled={!hasSamlIncluded}>
                    Manage
                  </Button>
                  <Modal>
                    <ConfigureDialog team={team} />
                  </Modal>
                </DialogTrigger>
                {team.samlSso.enabled ? (
                  <Tooltip content="SAML SSO is enabled">
                    <CheckCircle2Icon className="text-success-low size-6 shrink-0" />
                  </Tooltip>
                ) : (
                  <Tooltip content="SAML SSO is disabled">
                    <CircleSlashIcon className="text-low size-6 shrink-0" />
                  </Tooltip>
                )}
                <MenuTrigger>
                  <IconButton className="shrink-0">
                    <MoreVerticalIcon />
                  </IconButton>
                  <Popover>
                    <Menu aria-label="SAML options">
                      <MenuItem href={getReAuthenticateURL(team.samlSsoUrl)}>
                        Re-authenticate
                      </MenuItem>
                      {team.samlSso.enabled ? (
                        <MenuItem
                          onAction={() => {
                            toggleEnable(false);
                          }}
                        >
                          Disable
                        </MenuItem>
                      ) : (
                        <MenuItem
                          onAction={() => {
                            toggleEnable(true);
                          }}
                        >
                          Enable
                        </MenuItem>
                      )}
                      <MenuItem
                        variant="danger"
                        onAction={() => {
                          remove();
                        }}
                      >
                        Remove configuration
                      </MenuItem>
                    </Menu>
                  </Popover>
                </MenuTrigger>
              </div>
            </div>
            {team.me?.lastAuthMethod === "saml" ? (
              <div className="text-low flex items-center justify-between gap-4 border-t p-4">
                Require Team Members to login with SAML to access this Team.
                <Switch
                  isSelected={team.samlSso.enforced}
                  onChange={(isSelected) => {
                    invariant(team.samlSso);
                    update({
                      variables: {
                        input: {
                          teamAccountId: team.id,
                          enforced: isSelected,
                        },
                      },
                      optimisticResponse: {
                        configureTeamSaml: {
                          __typename: "TeamSamlConfig",
                          ...team.samlSso,
                          enforced: isSelected,
                        },
                      },
                    });
                  }}
                />
              </div>
            ) : (
              <div className="text-low flex items-center justify-between gap-4 border-t p-4">
                Please authenticate with SAML before enforcing SAML for this
                team.
                <LinkButton href={getReAuthenticateURL(team.samlSsoUrl)}>
                  Re-authenticate
                </LinkButton>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-sm border p-4 text-sm">
            <LockIcon className="size-6 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">SAML</div>
              <p className="text-low">
                Allow Team Members to login using an Identity Provider.
              </p>
            </div>
            <DialogTrigger>
              <Button variant="secondary" isDisabled={!hasSamlIncluded}>
                Configure
              </Button>
              <Modal>
                <ConfigureDialog team={team} />
              </Modal>
            </DialogTrigger>
          </div>
        )}
      </CardBody>
      {hasSamlIncluded ? null : (
        <CardFooter className="flex items-center justify-between gap-4">
          <div>SAML is only available on the Enterprise plan.</div>
          <LinkButton href={CONTACT_HREF} target="_blank">
            Contact Sales
          </LinkButton>
        </CardFooter>
      )}
    </Card>
  );
}

function getReAuthenticateURL(samlSsoUrl: string) {
  const ssoURL = new URL(samlSsoUrl);
  ssoURL.searchParams.set("r", window.location.pathname);
  return ssoURL.toString();
}

function ConfigureDialog(props: { team: DocumentType<typeof _TeamFragment> }) {
  const { team } = props;
  const config = team.samlSso;
  const form = useForm<Inputs>({
    defaultValues: {
      idpEntityId: config?.idpEntityId ?? "",
      ssoUrl: config?.ssoUrl ?? "",
      signingCertificate: config?.signingCertificate ?? "",
    },
  });
  const apolloClient = useApolloClient();
  const state = useOverlayTriggerState();

  const handleSubmit: SubmitHandler<Inputs> = async (data) => {
    await apolloClient.mutate({
      mutation: ConfigureTeamSamlMutation,
      variables: {
        input: {
          teamAccountId: team.id,
          enabled: team.samlSso?.enabled ?? true,
          ...data,
        },
      },
      refetchQueries: ["AccountSettings_account"],
    });
    state.close();
  };

  const handleMetadataDrop = useEventCallback((files: File[]) => {
    toast.promise(
      (async () => {
        const [file] = files;
        invariant(file, "A file is required");
        const metadataXml = await file.text();
        const result = await apolloClient.mutate({
          mutation: ImportTeamSamlMetadataMutation,
          variables: {
            teamAccountId: team.id,
            metadataXml,
          },
        });
        if (!result.data) {
          throw new Error(`Failed to import metadata`);
        }

        form.setValue(
          "idpEntityId",
          result.data.importTeamSamlMetadata.idpEntityId,
        );
        form.setValue(
          "signingCertificate",
          result.data.importTeamSamlMetadata.signingCertificate,
        );
        form.setValue("ssoUrl", result.data.importTeamSamlMetadata.ssoUrl);
      })(),
      {
        loading: "Importing metadata…",
        success: "All fields have been prefilled from metadata!",
        error: (data) => getErrorMessage(data),
      },
    );
  });

  return (
    <Dialog scrollable={false} className="flex w-3xl max-w-full flex-col">
      <Form noValidate className="contents" form={form} onSubmit={handleSubmit}>
        <DialogBody className="min-h-0 overflow-auto">
          <DialogTitle>Configure SAML Identity Provider</DialogTitle>
          <Separator className="my-8" />
          <h3 className="mb-1 text-base font-medium">
            1. Configure your Identity Provider for Argos SAML
          </h3>
          <p className="text-low">
            Use the following values when creating a new SAML application in
            your Identity Provider to connect it to Argos. These settings allow
            your Identity Provider to recognize Argos and securely authenticate
            your users.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-6">
            <CopyableInputGroup
              title="Metadata URL"
              description={
                <>
                  URL exposing Argos Service Provider metadata. Your Identity
                  Provider can automatically import configuration from this URL.
                </>
              }
              value={team.samlMetadataUrl}
            />
            <CopyableInputGroup
              title="ACS URL"
              description={
                <>
                  Endpoint where your Identity Provider sends authentication
                  responses after login.
                </>
              }
              value={team.samlAcsUrl}
            />
            <CopyableInputGroup
              title="Entity ID"
              description={
                <>
                  Unique identifier of Argos. Used by your Identity Provider to
                  identify Argos as the Service Provider.
                </>
              }
              value={team.samlSpEntityId}
            />
            <CopyableInputGroup
              title="Single Sign On URL"
              description={
                <>
                  URL used to initiate login to Argos via SAML. Configure this
                  as the Login URL or Start URL in your Identity Provider.
                </>
              }
              value={team.samlSsoUrl}
            />
          </div>
          <Separator className="my-8" />
          <h3 className="mb-1 text-base font-medium">
            2. Configure Argos with your Identity Provider
          </h3>
          <p className="text-low">
            Provide your Identity Provider SAML metadata to complete the
            connection. You can upload the metadata XML file for automatic
            configuration, or enter the Single Sign-On URL, Issuer, and signing
            certificate manually.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <div className="mb-1 font-medium">
                Auto configure from Identity Provider metadata
              </div>
              <p className="text-low mb-2 text-xs">
                Upload your Identity Provider metadata XML file to automatically
                configure the SAML connection.
              </p>
              <MetadataXMLDropzone onDrop={handleMetadataDrop} />
            </div>
            <FormTextInput
              control={form.control}
              disabled={form.formState.isSubmitting}
              label="Single Sign On URL"
              type="url"
              {...form.register("ssoUrl", {
                required: "Required",
                validate: (value) => {
                  if (value && !z.url().safeParse(value).success) {
                    return "Invalid URL";
                  }
                  return undefined;
                },
              })}
            />
            <FormTextInput
              control={form.control}
              disabled={form.formState.isSubmitting}
              label="Issuer (Entity ID)"
              {...form.register("idpEntityId", {
                required: "Required",
              })}
            />
            <CertificateField control={form.control} />
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogDismiss>Cancel</DialogDismiss>
          <FormSubmit control={form.control}>Save</FormSubmit>
        </DialogFooter>
      </Form>
    </Dialog>
  );
}

function MetadataXMLDropzone(props: Pick<DropzoneProps, "onDrop">) {
  return (
    <Dropzone
      multiple={false}
      accept={{
        "text/xml": [".xml"],
      }}
      onDrop={props.onDrop}
    >
      {({ isDragAccept, isDragReject }) =>
        isDragAccept ? (
          <p>Drop the file here</p>
        ) : isDragReject ? (
          <p>Only XML files are accepted</p>
        ) : (
          <p>Drop metadata XML file here, or click to select</p>
        )
      }
    </Dropzone>
  );
}

function CertificateField(props: { control: Control<Inputs, any, Inputs> }) {
  const { control } = props;
  const { isSubmitting } = useFormState({ control });
  const {
    field,
    fieldState: { error },
  } = useController({
    name: "signingCertificate",
    control,
    rules: {
      required: "Required",
    },
  });
  const handleDrop = useEventCallback(async (files: File[]) => {
    const [file] = files;
    invariant(file, "A file is required");
    try {
      const text = await file.text();
      field.onChange(text);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });
  return (
    <div>
      <Label invalid={Boolean(error)}>Certificate</Label>
      <Dropzone
        ref={field.ref}
        accept={{
          "application/x-pem-file": [".pem"],
          "application/x-x509-ca-cert": [".crt", ".cer"],
          "application/pkix-cert": [".cer"],
          "application/x-pkcs12": [".p12", ".pfx"],
          "application/pkcs12": [".p12", ".pfx"],
          "application/x-pkcs7-certificates": [".p7b"],
          "application/octet-stream": [".der"],
        }}
        multiple={false}
        onDrop={handleDrop}
        invalid={Boolean(error)}
        name={field.name}
        onBlur={field.onBlur}
        disabled={isSubmitting}
      >
        {({ isDragAccept, isDragReject }) =>
          isDragAccept ? (
            <p>Drop the file here</p>
          ) : isDragReject ? (
            <p>Only certificate files are accepted</p>
          ) : field.value ? (
            <div className="relative">
              <pre className="text-default text-xs break-all whitespace-pre-wrap">
                {field.value}
              </pre>
            </div>
          ) : (
            <p>Drop the certificate file here, or click to select</p>
          )
        }
      </Dropzone>
      {typeof error?.message === "string" && (
        <ErrorMessage className="mt-2">{error.message}</ErrorMessage>
      )}
    </div>
  );
}

function CopyableInputGroup(props: {
  title: React.ReactNode;
  description: React.ReactNode;
  value: string;
}) {
  const { title, description, value } = props;
  const inputId = useId();
  return (
    <div>
      <Label htmlFor={inputId}>{title}</Label>
      <TextInputGroup className="mb-2">
        <TextInput id={inputId} readOnly value={value} scale="sm" />
        <TextInputAddon>
          <CopyButton text={value} />
        </TextInputAddon>
      </TextInputGroup>
      <p className="text-low text-xs">{description}</p>
    </div>
  );
}
