import { useMutation } from "@apollo/client";
import { Helmet } from "react-helmet";
import { SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { useAuthTokenPayload } from "@/containers/Auth";
import { graphql } from "@/gql";
import { Button } from "@/ui/Button";
import { Container } from "@/ui/Container";
import { FormError } from "@/ui/FormError";
import { FormTextInput } from "@/ui/FormTextInput";
import { Heading, Headline } from "@/ui/Typography";

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

const NewTeamForm = (props: { defaultTeamName: string }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<Inputs>({
    defaultValues: {
      name: props.defaultTeamName,
    },
  });
  const navigate = useNavigate();
  const [createTeam, { loading }] = useMutation(CreateTeamMutation);
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const result = await createTeam({
        variables: {
          name: data.name,
        },
      });
      if (!result.data) {
        throw new Error("No data returned from server.");
      }
      navigate(`/${result.data.createTeam.slug}`);
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

export const NewTeam = () => {
  const auth = useAuthTokenPayload();
  return (
    <>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <Container>
        <Heading>Create a Team</Heading>
        <Headline>
          A team alllows you to collaborate on one or several projects.
        </Headline>
        {auth && (
          <div className="mt-4 max-w-2xl">
            <NewTeamForm
              defaultTeamName={`${
                auth.account.name || auth.account.slug
              }'s Team`}
            />
          </div>
        )}
      </Container>
    </>
  );
};
