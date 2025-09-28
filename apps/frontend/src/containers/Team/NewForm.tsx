import { useApolloClient, useQuery } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { SubmitHandler, useForm } from "react-hook-form";

import { graphql } from "@/gql";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { useEventCallback } from "@/ui/useEventCallback";

const CreateTeamMutation = graphql(`
  mutation NewTeam_createTeam($name: String!) {
    createTeam(input: { name: $name }) {
      redirectUrl
    }
  }
`);

type Inputs = {
  name: string;
};

const MeQuery = graphql(`
  query TeamNewForm_me {
    me {
      id
      stripeCustomerId
      hasSubscribedToTrial
    }
  }
`);

export const useCreateTeamAndRedirect = () => {
  const client = useApolloClient();
  const createTeamAndRedirect = useEventCallback(
    async (data: { name: string }) => {
      const result = await client.mutate({
        mutation: CreateTeamMutation,
        variables: {
          name: data.name,
        },
      });
      invariant(result.data, "missing data");
      const redirectUrl = result.data.createTeam.redirectUrl;
      window.location.replace(redirectUrl);
      await new Promise(() => {
        // Infinite promise while we redirect to keep the form in submitting state
      });
    },
  );
  return createTeamAndRedirect;
};

export const TeamNewForm = (props: {
  defaultTeamName?: string | null;
  successUrl?: (team: { id: string; slug: string }) => string;
  cancelUrl?: (team: { id: string; slug: string }) => string;
}) => {
  const createTeamAndRedirect = useCreateTeamAndRedirect();

  const { data, error } = useQuery(MeQuery);
  if (error) {
    throw error;
  }
  const form = useForm<Inputs>({
    defaultValues: {
      name: props.defaultTeamName ?? "",
    },
  });
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    await createTeamAndRedirect(data);
  };
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
};
