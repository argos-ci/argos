import { useMutation } from "@apollo/client";
import { SubmitHandler, useForm } from "react-hook-form";

import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { FormError } from "@/ui/FormError";
import { FormTextInput } from "@/ui/FormTextInput";

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
};

export const TeamNewForm = (props: TeamNewFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Inputs>({
    defaultValues: {
      name: props.defaultTeamName ?? "",
    },
  });
  const [createTeam, { loading }] = useMutation(CreateTeamMutation);
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const result = await createTeam({
        variables: {
          name: data.name,
        },
      });
      const team = result.data?.createTeam;
      if (!team) {
        throw new Error("Invariant: missing team");
      }
      props.onCreate(team);
    } catch (error) {
      setError("root.serverError", {
        type: "manual",
        message: "Something went wrong. Please try again.",
      });
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormTextInput
        label="Team Name"
        autoFocus
        error={errors.name}
        disabled={loading}
        {...register("name", {
          required: {
            value: true,
            message: "Team name is required",
          },
        })}
      />
      <div className="mt-8 flex items-center justify-end gap-4">
        {errors.root?.serverError && (
          <FormError>{errors.root.serverError.message}</FormError>
        )}
        <Button type="submit" disabled={loading}>
          Continue
        </Button>
      </div>
    </form>
  );
};
