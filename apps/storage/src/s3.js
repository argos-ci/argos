import AWS from "aws-sdk";
import S3 from "aws-sdk/clients/s3";

AWS.config.setPromisesDependency(Promise);

let client;

export function s3() {
  if (!client) {
    client = new S3({ signatureVersion: "v4", region: "eu-west-1" });
  }
  return client;
}
