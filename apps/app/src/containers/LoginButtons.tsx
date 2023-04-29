import { useLocation } from "react-router-dom";

import { GitHubLoginButton } from "@/containers/GitHub";
import { Anchor } from "@/ui/Link";

export type LoginButtonsProps = {
  redirect?: string | null;
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
      >
        Continue with GitHub
      </GitHubLoginButton>
      <p className="mt-6 text-left text-sm text-on-light">
        Argos only supports GitHub as account provider.
        <br />
        Use another provider?{" "}
        <Anchor href="mailto:contact@argos-ci.com">Contact us</Anchor>
      </p>
    </div>
  );
};
