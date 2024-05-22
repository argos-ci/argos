import { clsx } from "clsx";
import { useLocation } from "react-router-dom";

import config from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { GoogleLoginButton } from "@/containers/Google";
import { Link } from "@/ui/Link";

export function LoginButtons(props: {
  redirect?: string | null;
  isDisabled?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const redirect = props.redirect ?? location.pathname + location.search;
  return (
    <div className={clsx("w-full max-w-sm", props.className)}>
      <div className="flex flex-col gap-4">
        <GitHubLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          isDisabled={props.isDisabled}
        >
          Continue with GitHub
        </GitHubLoginButton>
        <GitLabLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          isDisabled={props.isDisabled}
        >
          Continue with GitLab
        </GitLabLoginButton>
        <GoogleLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          isDisabled={props.isDisabled}
        >
          Continue with Google
        </GoogleLoginButton>
      </div>
      <p className="text-low mt-6 text-left text-sm">
        Need another login provider?{" "}
        <Link href={`mailto:${config.get("contactEmail")}`} target="_blank">
          Contact us
        </Link>
      </p>
    </div>
  );
}
