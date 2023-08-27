import { useLocation } from "react-router-dom";

import config from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { Anchor } from "@/ui/Link";

export type LoginButtonsProps = {
  redirect?: string | null;
  disabled?: boolean;
};

export const LoginButtons = (props: LoginButtonsProps) => {
  const location = useLocation();
  const redirect = props.redirect ?? location.pathname + location.search;
  return (
    <div style={{ width: 400 }}>
      <div className="flex flex-col gap-4">
        <GitHubLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          disabled={props.disabled}
        >
          Continue with GitHub
        </GitHubLoginButton>
        <GitLabLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          disabled={props.disabled}
        >
          Continue with GitLab
        </GitLabLoginButton>
      </div>
      <p className="mt-6 text-left text-sm text-low">
        Argos only supports GitHub and GitLab as account provider.
        <br />
        Need another provider?{" "}
        <Anchor href={`mailto:${config.get("contactEmail")}`}>
          Contact us
        </Anchor>
      </p>
    </div>
  );
};
