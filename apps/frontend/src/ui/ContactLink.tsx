import config from "@/config";

import { Anchor } from "./Anchor";

export const ContactLink = () => {
  return (
    <>
      Contact Argos support on{" "}
      <Anchor href="https://argos-ci.com/discord" external>
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
