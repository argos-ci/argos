import config from "../config";

export default {
  githubLogin: `${config.get("github.loginUrl")}&redirect_uri=${
    window.location.origin
  }/auth/github/callback?r=${encodeURIComponent(window.location.pathname)}`,
};
