import { useApolloClient } from "@apollo/client";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { graphql } from "@/gql";
import { Form } from "@/ui/Form";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Anchor } from "@/ui/Link";

const CreateTeamMutation = graphql(`
  mutation NewTeam_createTeam($name: String!) {
    createTeam(input: { name: $name }) {
      id
      slug
    }
  }
`);

type Inputs = {
  name: string;
};

export type TeamNewFormProps = {
  defaultTeamName?: string;
  onCreate: (team: { id: string; slug: string }) => void;
  trial?: boolean;
};

export const TeamNewForm = (props: TeamNewFormProps) => {
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
    const team = result.data?.createTeam;
    if (!team) {
      throw new Error("Invariant: missing team");
    }
    props.onCreate(team);
  };
  return (
    <FormProvider {...form}>
      <Form onSubmit={onSubmit}>
        <FormTextInput
          {...form.register("name", {
            required: "Team name is required",
          })}
          label="Team Name"
          autoFocus
        />
        <div className="mt-6 text-sm text-on-light">
          {props.trial
            ? "Continuing will start a 14-day Pro plan trial."
            : "Continuing will start a monthly Pro plan subscription."}{" "}
          <Anchor href="/pricing" external>
            Learn more
          </Anchor>
        </div>
        <div className="mt-4 flex items-center justify-end gap-4">
          <FormRootError />
          <FormSubmit disabled={form.formState.isSubmitted}>
            Continue
          </FormSubmit>
        </div>
      </Form>
    </FormProvider>
  );
};
