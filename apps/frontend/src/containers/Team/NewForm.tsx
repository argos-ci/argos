import { useApolloClient, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";

import { graphql } from "@/gql";
import { Form } from "@/ui/Form";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";

const CreateTeamMutation = graphql(`
  mutation NewTeam_createTeam($name: String!, $enableDomainAutoJoin: Boolean) {
    createTeam(
      input: { name: $name, enableDomainAutoJoin: $enableDomainAutoJoin }
    ) {
      redirectUrl
    }
  }
`);

type Inputs = {
  name: string;
  enableDomainAutoJoin: boolean;
};

const MeQuery = graphql(`
  query TeamNewForm_me {
    me {
      id
      stripeCustomerId
      hasSubscribedToTrial
      eligibleAutoJoinDomain
    }
  }
`);

export function useCreateTeamAndRedirect() {
  const client = useApolloClient();
  return async (data: { name: string; enableDomainAutoJoin?: boolean }) => {
    const result = await client.mutate({
      mutation: CreateTeamMutation,
      variables: {
        name: data.name,
        enableDomainAutoJoin: data.enableDomainAutoJoin ?? false,
      },
    });
    invariant(result.data, "missing data");
    const redirectUrl = result.data.createTeam.redirectUrl;
    window.location.replace(redirectUrl);
    await new Promise(() => {
      // Infinite promise while we redirect to keep the form in submitting state
    });
  };
}

export function TeamNewForm(props: {
  defaultTeamName?: string | null;
  successUrl?: (team: { id: string; slug: string }) => string;
  cancelUrl?: (team: { id: string; slug: string }) => string;
}) {
  const createTeamAndRedirect = useCreateTeamAndRedirect();

  const { data, error } = useQuery(MeQuery);
  if (error) {
    throw error;
  }
  const form = useForm<Inputs>({
    defaultValues: {
      name: props.defaultTeamName ?? "",
      // Opt-in: opening a team to a whole email domain should be a decision,
      // not a default someone clicks past.
      enableDomainAutoJoin: false,
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await createTeamAndRedirect(data);
  };
  // Null while the query is in flight, and for anyone whose verified addresses
  // are all on consumer providers — a domain shared with strangers is no basis
  // for letting them into a team.
  const autoJoinDomain = data?.me?.eligibleAutoJoinDomain ?? null;
  return (
    <Form form={form} onSubmit={onSubmit}>
      <FormTextInput
        control={form.control}
        {...form.register("name", {
          required: "Team name is required",
          maxLength: {
            value: 255,
            message: "Team name must be 255 characters or less",
          },
        })}
        label="Team Name"
        autoFocus
        autoComplete="off"
      />
      {autoJoinDomain ? (
        <FormCheckbox
          control={form.control}
          name="enableDomainAutoJoin"
          className="mt-4"
          label={
            <>
              Let <strong>@{autoJoinDomain}</strong> emails join this team
            </>
          }
          description={`Anyone who verifies an @${autoJoinDomain} address will see this team when they sign up and can join without an invite. You can change this later in the team settings.`}
        />
      ) : null}
      <p
        className={clsx(
          "text-default mt-4 text-sm font-medium",
          !data && "invisible",
        )}
      >
        {!data?.me?.hasSubscribedToTrial
          ? "Continue will start a 14-day Pro plan trial"
          : "You will be redirected to Stripe to complete the subscription"}
        .
      </p>
      <div className="mt-8 flex items-center justify-end gap-4">
        <FormRootError control={form.control} />
        <FormSubmit control={form.control}>Continue</FormSubmit>
      </div>
    </Form>
  );
}
