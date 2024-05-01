import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";

import { AuthGuard } from "@/containers/AuthGuard";
import {
  TeamNewForm,
  useCreateTeamAndRedirect,
} from "@/containers/Team/NewForm";
import { Container } from "@/ui/Container";
import { PageLoader } from "@/ui/PageLoader";
import { Heading, Headline } from "@/ui/Typography";

const AutoCreateTeam = ({ name }: { name: string }) => {
  const createTeamAndRedirect = useCreateTeamAndRedirect();
  useEffect(() => {
    createTeamAndRedirect({ name }).catch(() => {
      // If there is an error, redirect to the new team page
      // the user will be able to retry
      window.location.replace(`/teams/new?name=${encodeURIComponent(name)}`);
    });
  }, [name, createTeamAndRedirect]);
  return <PageLoader />;
};

/** @route */
export function Component() {
  const [params] = useSearchParams();
  const name = params.get("name");
  const autoSubmit = params.get("autoSubmit") === "true";

  if (name && autoSubmit) {
    return <AutoCreateTeam name={name} />;
  }

  return (
    <>
      <hr className="border-t" />
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <AuthGuard>
        {() => {
          return (
            <Container className="py-10">
              <Heading>Create a Team</Heading>
              <Headline>
                A team alllows you to collaborate on one or several projects.
              </Headline>
              <div className="mt-4 max-w-2xl">
                <TeamNewForm defaultTeamName={name} />
              </div>
            </Container>
          );
        }}
      </AuthGuard>
    </>
  );
}
