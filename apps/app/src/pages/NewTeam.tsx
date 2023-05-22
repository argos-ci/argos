import { Helmet } from "react-helmet";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuthTokenPayload } from "@/containers/Auth";
import { TeamNewForm } from "@/containers/Team/NewForm";
import { Container } from "@/ui/Container";
import { Heading, Headline } from "@/ui/Typography";

export const NewTeam = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const auth = useAuthTokenPayload();
  const name = decodeURIComponent(params.get("name") || "");

  return (
    <>
      <Helmet>
        <title>New Team</title>
      </Helmet>
      <Container>
        <Heading>Create a Team</Heading>
        <Headline>
          A team allows you to collaborate on one or several projects.
        </Headline>
        {auth && (
          <div className="mt-4 max-w-2xl">
            <TeamNewForm
              onCreate={(team) => {
                navigate(`/${team.slug}`);
              }}
              defaultTeamName={
                name || `${auth.account.name || auth.account.slug}'s Team`
              }
            />
          </div>
        )}
      </Container>
    </>
  );
};
