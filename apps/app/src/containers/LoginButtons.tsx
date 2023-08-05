import { useLocation } from "react-router-dom";

import config from "@/config";
import { GitHubLoginButton } from "@/containers/GitHub";
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
      <GitHubLoginButton
        redirect={redirect}
        size="large"
        className="w-full justify-center"
        disabled={props.disabled}
      >
        Continue with GitHub
      </GitHubLoginButton>
      <p className="mt-6 text-left text-sm text-low">
        Argos only supports GitHub as account provider.
        <br />
        Need another provider?{" "}
        <Anchor href={`mailto:${config.get("contactEmail")}`}>
          Contact us
        </Anchor>
      </p>
    </div>
  );
};
