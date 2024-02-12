import { useQuery } from "@/containers/Apollo";
import { GithubInstallationsSelect } from "@/containers/GithubInstallationsSelect";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDisclosure,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useDialogState,
} from "@/ui/Dialog";
import { Form } from "@/ui/Form";
import { FormError } from "@/ui/FormError";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { useApolloClient } from "@apollo/client";
import { invariant } from "@apollo/client/utilities/globals";
import {
  FormProvider,
  SubmitHandler,
  useController,
  useForm,
  useFormContext,
} from "react-hook-form";

const query = graphql(`
  query ConfigureGitHubSSO_installations {
    me {
      id
      ghInstallations {
        edges {
          id
          account {
            id
            login
          }
          ...GithubInstallationsSelect_GhApiInstallation
        }
        pageInfo {
          totalCount
        }
      }
    }
  }
`);

function GitHubInstallationsSelectControl() {
  const { data } = useQuery(query);
  const installations = (() => {
    if (!data) return [];
    invariant(data.me, "Expected me");
    return data.me.ghInstallations.edges;
  })();
  const form = useFormContext();
  const controller = useController({
    name: "ghInstallationId",
    control: form.control,
    rules: { required: "Please select a GitHub account" },
  });
  const value = (() => {
    if (!controller.field.value) return "";
    const installation = installations.find(
      (installation) => installation.id === controller.field.value,
    );
    invariant(installation, "Expected installation");
    return installation.id;
  })();
  return (
    <div>
      <GithubInstallationsSelect
        ref={controller.field.ref}
        installations={installations}
        value={value}
        setValue={(value) => {
          const installation = installations.find(
            (installation) => installation.id === value,
          );
          invariant(installation, "Expected installation");
          controller.field.onChange(installation.id);
        }}
      />
      {controller.fieldState.error?.message && (
        <FormError className="mt-2">
          {controller.fieldState.error.message}
        </FormError>
      )}
    </div>
  );
}

type FormInputs = { ghInstallationId: string };

const EnableGitHubSSOMutation = graphql(`
  mutation ConfigureGitHubSSO_enableGitHubSSOOnTeam(
    $teamAccountId: ID!
    $ghInstallationId: Int!
  ) {
    enableGitHubSSOOnTeam(
      input: {
        teamAccountId: $teamAccountId
        ghInstallationId: $ghInstallationId
      }
    ) {
      ...TeamGitHubSSO_Team
    }
  }
`);

export function ConfigureGitHubSSO(props: { teamAccountId: string }) {
  const dialog = useDialogState();
  const form = useForm<FormInputs>({
    defaultValues: {
      ghInstallationId: "",
    },
  });
  const client = useApolloClient();
  const onSubmit: SubmitHandler<FormInputs> = async (inputs) => {
    await client.mutate({
      mutation: EnableGitHubSSOMutation,
      variables: {
        teamAccountId: props.teamAccountId,
        ghInstallationId: Number(inputs.ghInstallationId),
      },
      refetchQueries: ["TeamMembers_teamMembers"],
    });
  };
  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color="primary">
            Configure
          </Button>
        )}
      </DialogDisclosure>
      <Dialog state={dialog} style={{ width: 560 }}>
        {dialog.mounted && (
          <FormProvider {...form}>
            <Form onSubmit={onSubmit}>
              <DialogBody>
                <DialogTitle>Configure GitHub Single Sign-On</DialogTitle>
                <DialogText className="mb-8">
                  Choose a GitHub Organization to enable GitHub Single Sign-On.
                  People from your GitHub organization will be automatically
                  added to your Argos Team. You will be able to configure role
                  for each Team member.
                </DialogText>
                <GitHubInstallationsSelectControl />
              </DialogBody>
              <DialogFooter>
                <FormRootError />
                <DialogDismiss>Cancel</DialogDismiss>
                <FormSubmit>Configure</FormSubmit>
              </DialogFooter>
            </Form>
          </FormProvider>
        )}
      </Dialog>
    </>
  );
}
