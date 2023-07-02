import { useApolloClient, useQuery } from "@apollo/client";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { graphql } from "@/gql";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";

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

export type TeamNewFormProps = {
  defaultTeamName?: string | null;
  autoSubmit?: boolean;
  successUrl?: (team: { id: string; slug: string }) => string;
  cancelUrl?: (team: { id: string; slug: string }) => string;
};

export const TeamNewForm = (props: TeamNewFormProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [initialAutoSubmit] = useState(props.autoSubmit);
  useEffect(() => {
    if (initialAutoSubmit) {
      formRef.current?.requestSubmit();
    }
  }, [initialAutoSubmit]);
  const { data } = useQuery(MeQuery);
  const form = useForm<Inputs>({
    defaultValues: {
      name: props.defaultTeamName ?? "",
    },
  });
  const client = useApolloClient();
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    const result = await client.mutate({
      mutation: CreateTeamMutation,
      variables: {
        name: data.name,
      },
    });
    if (!result.data) {
      throw new Error("Invariant: missing data");
    }
    const redirectUrl = result.data.createTeam.redirectUrl;
    window.location.replace(redirectUrl);
    await new Promise(() => {
      // Infinite promise while we redirect to keep the form in submitting state
    });
  };
  return (
    <FormProvider {...form}>
      <Form ref={formRef} onSubmit={onSubmit}>
        <FormTextInput
          {...form.register("name", {
            required: "Team name is required",
          })}
          label="Team Name"
          autoFocus
          autoComplete="off"
        />
        <p className={clsx("mt-4 font-medium text-on", !data && "invisible")}>
          You will be redirected to Stripe to{" "}
          {!data?.me?.hasSubscribedToTrial
            ? "start a 14-day Pro plan trial"
            : "complete the subscription"}
          .
        </p>
        <div className="mt-8 flex items-center justify-end gap-4">
          <FormRootError />
          <FormSubmit>Continue</FormSubmit>
        </div>
      </Form>
    </FormProvider>
  );
};
