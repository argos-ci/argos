import { GITHUB_SSO_PRICING } from "@/constants";
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
import { Tooltip } from "@/ui/Tooltip";
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

function getButtonLabel(priced: boolean) {
  return priced ? "Enable and Pay" : "Enable";
}

function ActiveConfigureSSO(props: { teamAccountId: string; priced: boolean }) {
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
    dialog.hide();
  };

  return (
    <>
      <DialogDisclosure state={dialog}>
        {(disclosureProps) => (
          <Button {...disclosureProps} color="primary">
            {getButtonLabel(props.priced)}
          </Button>
        )}
      </DialogDisclosure>
      <Dialog state={dialog} style={{ width: 560 }}>
        {dialog.mounted && (
          <FormProvider {...form}>
            <Form onSubmit={onSubmit}>
              <DialogBody>
                <DialogTitle>Enable GitHub Single Sign-On</DialogTitle>
                <DialogText className="mb-8">
                  Choose a GitHub Organization to enable GitHub Single Sign-On.
                  People from your GitHub organization will be automatically
                  added to your Argos Team. You will be able to configure role
                  for each Team member.
                </DialogText>
                <GitHubInstallationsSelectControl />
                {props.priced ? (
                  <>
                    <div className="my-8">
                      By clicking <strong>Enable and Pay</strong>, the amount of{" "}
                      <strong>${GITHUB_SSO_PRICING}</strong> will be added to
                      your invoice and your credit card will be charged at the
                      end of your next billing cycle.
                    </div>
                    <div className="flex justify-between font-bold text-low my-2">
                      <div>GitHub Single Sign-On</div>
                      <div>${GITHUB_SSO_PRICING} / month</div>
                    </div>
                    <hr className="border-0 border-t my-2" />
                    <div className="flex justify-between font-bold my-2">
                      <div>Total</div>
                      <div>${GITHUB_SSO_PRICING} / month</div>
                    </div>
                  </>
                ) : (
                  <div className="my-8">
                    By clicking <strong>Enable</strong>, you will enable the
                    GitHub Single Sign-On feature for your Team.
                  </div>
                )}
              </DialogBody>
              <DialogFooter>
                <FormRootError />
                <DialogDismiss>Cancel</DialogDismiss>
                <FormSubmit>
                  {props.priced ? "Enable and Pay" : "Enable"}
                </FormSubmit>
              </DialogFooter>
            </Form>
          </FormProvider>
        )}
      </Dialog>
    </>
  );
}

export function ConfigureGitHubSSO(props: {
  teamAccountId: string;
  priced: boolean;
  disabledReason: React.ReactNode;
}) {
  if (props.disabledReason) {
    return (
      <Tooltip content={props.disabledReason}>
        <Button disabled accessibleWhenDisabled>
          {getButtonLabel(props.priced)}
        </Button>
      </Tooltip>
    );
  }

  return (
    <ActiveConfigureSSO
      teamAccountId={props.teamAccountId}
      priced={props.priced}
    />
  );
}
