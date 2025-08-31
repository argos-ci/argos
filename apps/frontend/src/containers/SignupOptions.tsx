import { useLocation } from "react-router-dom";

import { config } from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
import { GitLabLoginButton } from "@/containers/GitLab";
import { GoogleLoginButton } from "@/containers/Google";
import { Link } from "@/ui/Link";

export function SignupOptions(props: {
  redirect?: string | null;
  isDisabled?: boolean;
  className?: string;
}) {
  const location = useLocation();
  const redirect = props.redirect ?? location.pathname + location.search;
  return (
    <div className={props.className}>
      <div className="flex flex-col gap-4">
        <GoogleLoginButton
          redirect={redirect}
          size="large"
          className="w-full justify-center"
          isDisabled={props.isDisabled}
        >
          Continue with Google
        </GoogleLoginButton>
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
      </div>
      <p className="text-low mt-6 text-center text-sm">
        Need another login provider?{" "}
        <Link href={`mailto:${config.contactEmail}`} target="_blank">
          Contact us
        </Link>
      </p>
    </div>
  );
}
