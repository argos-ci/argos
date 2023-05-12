import config from "@/config";

import { Anchor } from "./Link";

export const ContactLink = () => {
  return (
    <>
      Contact Argos support on{" "}
      <Anchor href="https://discord.gg/WjzGrQGS4A" external>
        Discord
      </Anchor>{" "}
      or{" "}
      <Anchor href={`mailto:${config.get("contactEmail")}`} external>
        by email
      </Anchor>
      {"  "}to manage your subscription.
    </>
  );
};
