import { useLocation } from "react-router-dom";

import config from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { Anchor } from "@/ui/Anchor";
import { clsx } from "clsx";

export const LoginButtons = (props: {
  redirect?: string | null;
  disabled?: boolean;
  className?: string;
}) => {
  const location = useLocation();
  const redirect = props.redirect ?? location.pathname + location.search;
  return (
    <div className={clsx("w-full max-w-sm", props.className)}>
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
        Need another login provider?{" "}
        <Anchor href={`mailto:${config.get("contactEmail")}`}>
          Contact us
        </Anchor>
      </p>
    </div>
  );
};
