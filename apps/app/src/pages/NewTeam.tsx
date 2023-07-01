import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";

import { AuthGuard } from "@/containers/AuthGuard";
import { TeamNewForm } from "@/containers/Team/NewForm";
import { Container } from "@/ui/Container";
import { Heading, Headline } from "@/ui/Typography";

export const NewTeam = () => {
  const [params] = useSearchParams();
  return (
    <>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <AuthGuard>
        {() => {
          return (
            <Container>
              <Heading>Create a Team</Heading>
              <Headline>
                A team alllows you to collaborate on one or several projects.
              </Headline>
              <div className="mt-4 max-w-2xl">
                <TeamNewForm
                  defaultTeamName={params.get("name")}
                  autoSubmit={params.get("autoSubmit") === "true"}
                />
              </div>
            </Container>
          );
        }}
      </AuthGuard>
    </>
  );
};
