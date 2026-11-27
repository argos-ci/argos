import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";

import { graphql } from "@/gql";
import { UserFacingError } from "@/util/error";
import { formatBytes } from "@/util/media";

const CreateUploadMutation = graphql(`
  mutation FileUpload_createUpload {
    createUpload {
      url
      fields
      maxBytes
      key
    }
  }
`);

/**
 * Upload a file straight to storage, and get the key the mutation it is for
 * takes.
 */
export function useUploadFile() {
  const client = useApolloClient();
  return async (file: File): Promise<string> => {
    const { data } = await client.mutate({ mutation: CreateUploadMutation });
    invariant(data, "createUpload returned no data");
    const upload = data.createUpload;
    if (file.size > upload.maxBytes) {
      throw new UserFacingError(
        `This file is larger than ${formatBytes(upload.maxBytes)}. Use a smaller one.`,
      );
    }
    // S3 wants the policy fields first and the file last.
    const body = new FormData();
    for (const [name, value] of Object.entries(upload.fields)) {
      body.append(name, String(value));
    }
    body.append("file", file);
    const response = await fetch(upload.url, { method: "POST", body }).catch(
      () => null,
    );
    if (!response?.ok) {
      throw new UserFacingError("The file could not be uploaded. Try again.");
    }
    return upload.key;
  };
}
