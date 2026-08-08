import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { UploadIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { graphql } from "@/gql";
import { Button, ButtonIcon } from "@/ui/Button";
import {
  Dialog,
  DialogBody,
  DialogDismiss,
  DialogFooter,
  DialogText,
  DialogTitle,
  useOverlayTriggerState,
} from "@/ui/Dialog";
import { Dropzone } from "@/ui/Dropzone";
import { ErrorMessage } from "@/ui/ErrorMessage";
import { Modal } from "@/ui/Modal";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";
import { formatBytes } from "@/util/media";

/**
 * File types the drop zone accepts, mirroring what the API accepts. Keeping the
 * two in step matters more than the list being short: a file the picker offered
 * and the API then rejects is the worst version of this interaction.
 */
const ACCEPTED_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

const AccountIdQuery = graphql(`
  query MediaUpload_account($slug: String!) {
    account(slug: $slug) {
      id
    }
  }
`);

const CreateMediaMutation = graphql(`
  mutation MediaUpload_createMedia($input: CreateMediaInput!) {
    createMedia(input: $input) {
      media {
        id
        url
        markdown
      }
      upload {
        url
        fields
      }
    }
  }
`);

const FinalizeMediaMutation = graphql(`
  mutation MediaUpload_finalizeMedia($input: FinalizeMediaInput!) {
    finalizeMedia(input: $input) {
      id
      url
      markdown
      status
    }
  }
`);

export function MediaUploadButton(props: { accountSlug: string }) {
  return (
    <DialogTrigger>
      <Button variant="primary">
        <ButtonIcon>
          <UploadIcon />
        </ButtonIcon>
        Upload
      </Button>
      <Modal>
        <MediaUploadDialog accountSlug={props.accountSlug} />
      </Modal>
    </DialogTrigger>
  );
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; name: string }
  | { status: "error"; message: string };

function MediaUploadDialog(props: { accountSlug: string }) {
  const client = useApolloClient();
  const state = useOverlayTriggerState();
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });

  const isUploading = upload.status === "uploading";

  const handleDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setUpload({ status: "uploading", name: file.name });

    try {
      const url = await uploadFile({
        client,
        file,
        accountSlug: props.accountSlug,
      });
      // The link is the point of the whole interaction, so it goes to the
      // clipboard without being asked for.
      await navigator.clipboard.writeText(url).catch(() => {
        // Clipboard access can be denied; the media still uploaded.
      });
      toast.success("Uploaded — link copied to your clipboard");
      state.close();
      // The library query refetches so the new row appears.
      await client.refetchQueries({ include: ["AccountMedia_account_media"] });
    } catch (error) {
      setUpload({ status: "error", message: getErrorMessage(error) });
    }
  };

  return (
    <Dialog size="medium">
      <DialogBody>
        <DialogTitle>Upload media</DialogTitle>
        <DialogText>
          Drop an image or a video to get a link you can paste into a pull
          request or a chat message.
        </DialogText>
        <Dropzone
          accept={ACCEPTED_TYPES}
          multiple={false}
          disabled={isUploading}
          onDrop={(files) => {
            void handleDrop(files);
          }}
          className="mt-4 py-8"
        >
          {() =>
            isUploading ? (
              <span>Uploading {upload.name}…</span>
            ) : (
              <span>
                Drop a file here, or click to choose one.
                <br />
                <span className="text-xs">
                  PNG, JPEG, WebP, AVIF, GIF, MP4, WebM or MOV.
                </span>
              </span>
            )
          }
        </Dropzone>
        {upload.status === "error" ? (
          <ErrorMessage className="mt-3">{upload.message}</ErrorMessage>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <DialogDismiss>Close</DialogDismiss>
      </DialogFooter>
    </Dialog>
  );
}

/**
 * Register the file, send its bytes straight to storage, then finalize.
 *
 * The bytes never pass through Argos: the browser posts them to the signed target
 * with the policy fields storage itself enforces, which is what makes a 500 MB
 * screen recording a normal upload rather than a request that times out.
 */
async function uploadFile(args: {
  client: ReturnType<typeof useApolloClient>;
  file: File;
  accountSlug: string;
}): Promise<string> {
  const { client, file, accountSlug } = args;

  const accountResult = await client.query({
    query: AccountIdQuery,
    variables: { slug: accountSlug },
  });
  const accountId = accountResult.data?.account?.id;
  if (!accountId) {
    throw new Error("Team not found.");
  }

  const hash = await hashFile(file);

  const created = await client.mutate({
    mutation: CreateMediaMutation,
    variables: {
      input: {
        accountId,
        name: file.name,
        contentType: file.type,
        size: file.size,
        hash,
      },
    },
  });

  const payload = created.data?.createMedia;
  if (!payload) {
    throw new Error("Upload could not be started.");
  }

  if (payload.upload) {
    await postToStorage({ target: payload.upload, file });
    const finalized = await client.mutate({
      mutation: FinalizeMediaMutation,
      variables: { input: { id: payload.media.id } },
    });
    return finalized.data?.finalizeMedia.url ?? payload.media.url;
  }

  // Argos already held this exact file, so it is ready as-is.
  return payload.media.url;
}

async function postToStorage(args: {
  target: { url: string; fields: Record<string, string> };
  file: File;
}): Promise<void> {
  const formData = new FormData();
  // The policy fields have to precede the file part for storage to accept them.
  for (const [key, value] of Object.entries(args.target.fields)) {
    formData.append(key, value);
  }
  formData.append("file", args.file, args.file.name);

  const response = await fetch(args.target.url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `The file could not be uploaded (${response.status}). It may be larger than your plan allows — the limit is ${formatBytes(500 * 1024 * 1024)} on Pro.`,
    );
  }
}

/**
 * SHA-256 the file so the key is content-addressed: the same file uploaded twice
 * costs one hash and no transfer.
 */
async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
