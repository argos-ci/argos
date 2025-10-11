import { useApolloClient, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  SubmitHandler,
  useController,
  useForm,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";

import { GITHUB_SSO_PRICING } from "@/constants";
import { GithubInstallationsSelect } from "@/containers/GithubInstallationsSelect";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
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
import { Modal } from "@/ui/Modal";
import { Tooltip } from "@/ui/Tooltip";

const query = graphql(`
  query ConfigureGitHubSSO_installations($teamAccountId: ID!) {
    teamAccount: accountById(id: $teamAccountId) {
      id
      ... on Team {
        githubLightInstallation {
          id
          ghInstallation {
            id
            ...GithubInstallationsSelect_GhApiInstallation
          }
        }
      }
    }
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

function GitHubInstallationsSelectControl<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
>(props: {
  name: Path<TFieldValues>;
  teamAccountId: string;
  control: Control<TFieldValues, TContext, TTransformedValues>;
}) {
  const { teamAccountId, control, name } = props;
  const { data, error } = useQuery(query, {
    variables: { teamAccountId },
  });
  if (error) {
    throw error;
  }
  const installations = (() => {
    if (!data) {
      return [];
    }
    invariant(data.me, "Expected me");
    return data.me.ghInstallations.edges;
  })();

  const installationType = (() => {
    if (!data) {
      return null;
    }
    invariant(installations, "Expected installations");
    invariant(data.teamAccount?.__typename === "Team", "Expected teamAccount");
    return data.teamAccount.githubLightInstallation ? "light" : "main";
  })();
  const { field, fieldState } = useController({
    name,
    control,
    rules: { required: "Please select a GitHub account" },
  });
  const { value: fieldValue, ref } = field;
  const installation = (() => {
    if (!fieldValue) {
      return null;
    }
    const installation = installations.find(
      (installation) => installation.id === fieldValue,
    );
    invariant(installation, "Expected installation");
    return installation;
  })();
  const value = installation?.id ?? "";
  const errorMessage = fieldState.error?.message;
  return (
    <div>
      <GithubInstallationsSelect
        ref={ref}
        installations={installations}
        value={value}
        setValue={(value) => {
          const installation = installations.find(
            (installation) => installation.id === value,
          );
          invariant(installation, "Expected installation");
          field.onChange(installation.id);
        }}
        disabled={!data}
        app={installationType ?? "main"}
        accountId={props.teamAccountId}
      />
      {errorMessage && (
        <ErrorMessage className="mt-2">{errorMessage}</ErrorMessage>
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

function ActiveConfigureSSOForm(props: {
  teamAccountId: string;
  priced: boolean;
}) {
  const form = useForm<FormInputs>({
    defaultValues: {
      ghInstallationId: "",
    },
  });
  const client = useApolloClient();
  const state = useOverlayTriggerState();
  const onSubmit: SubmitHandler<FormInputs> = async (inputs) => {
    await client.mutate({
      mutation: EnableGitHubSSOMutation,
      variables: {
        teamAccountId: props.teamAccountId,
        ghInstallationId: Number(inputs.ghInstallationId),
      },
      refetchQueries: ["TeamMembers_teamMembers"],
    });
    state.close();
  };
  return (
    <Form form={form} onSubmit={onSubmit}>
      <DialogBody>
        <DialogTitle>Enable GitHub Single Sign-On</DialogTitle>
        <DialogText className="mb-8">
          Choose a GitHub Organization to enable GitHub Single Sign-On. People
          from your GitHub organization will be automatically added to your
          Argos Team. You will be able to configure role for each Team member.
        </DialogText>
        <GitHubInstallationsSelectControl
          control={form.control}
          name="ghInstallationId"
          teamAccountId={props.teamAccountId}
        />
        {props.priced ? (
          <>
            <div className="my-8">
              By clicking <strong>Enable and Pay</strong>, the amount of{" "}
              <strong>${GITHUB_SSO_PRICING}</strong> will be added to your
              invoice and your credit card will be charged at the end of your
              next billing cycle.
            </div>
            <div className="text-low my-2 flex justify-between font-bold">
              <div>GitHub Single Sign-On</div>
              <div>${GITHUB_SSO_PRICING} / month</div>
            </div>
            <hr className="my-2 border-0 border-t" />
            <div className="my-2 flex justify-between font-bold">
              <div>Total</div>
              <div>${GITHUB_SSO_PRICING} / month</div>
            </div>
          </>
        ) : (
          <div className="my-8">
            By clicking <strong>Enable</strong>, you will enable the GitHub
            Single Sign-On feature for your Team.
          </div>
        )}
      </DialogBody>
      <DialogFooter>
        <FormRootError control={form.control} />
        <DialogDismiss>Cancel</DialogDismiss>
        <FormSubmit control={form.control}>
          {props.priced ? "Enable and Pay" : "Enable"}
        </FormSubmit>
      </DialogFooter>
    </Form>
  );
}

function ActiveConfigureSSO(props: { teamAccountId: string; priced: boolean }) {
  return (
    <DialogTrigger>
      <Button>{getButtonLabel(props.priced)}</Button>
      <Modal>
        <Dialog size="medium">
          <ActiveConfigureSSOForm
            teamAccountId={props.teamAccountId}
            priced={props.priced}
          />
        </Dialog>
      </Modal>
    </DialogTrigger>
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
        <div className="flex">
          <Button isDisabled>{getButtonLabel(props.priced)}</Button>
        </div>
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
