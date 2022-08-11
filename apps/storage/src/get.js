import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function get({ s3, ...other }) {
  return s3.send(new GetObjectCommand(other));
}
