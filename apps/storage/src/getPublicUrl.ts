import config from "@argos-ci/config";

export const getPublicUrl = (s3Id: string) => {
  if (config.get("s3.publicBaseUrl")) {
    return new URL(s3Id, config.get("s3.publicBaseUrl")).href;
  }

  return new URL(`/screenshots/${s3Id}`, config.get("server.url")).href;
};
