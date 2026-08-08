import { useState } from "react";
import { useApolloClient, useSuspenseQuery } from "@apollo/client/react";
import { UploadIcon } from "lucide-react";
import { DialogTrigger } from "react-aria-components";

import { graphql } from "@/gql";
import { ProjectPermission } from "@/gql/graphql";
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
import { ListBox, ListBoxItem } from "@/ui/ListBox";
import { Modal } from "@/ui/Modal";
import { Popover } from "@/ui/Popover";
import { Select, SelectButton } from "@/ui/Select";
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

const UploadProjectsQuery = graphql(`
  query MediaUpload_projects($slug: String!) {
    account(slug: $slug) {
      id
      projects(first: 100, after: 0) {
        edges {
          id
          name
          permissions
        }
      }
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
  const [projectId, setProjectId] = useState<string | null>(null);

  // Media belongs to a project, so one has to be chosen. Only projects the
  // viewer may write to are offered — uploading spends the account's quota.
  const { data } = useSuspenseQuery(UploadProjectsQuery, {
    variables: { slug: props.accountSlug },
  });
  const projects = (data.account?.projects.edges ?? []).filter((project) =>
    project.permissions.includes(ProjectPermission.Review),
  );
  const selectedProjectId = projectId ?? projects[0]?.id ?? null;
  const isUploading = upload.status === "uploading";

  const handleDrop = async (files: File[]) => {
    const file = files[0];
    if (!file || !selectedProjectId) {
      return;
    }

    setUpload({ status: "uploading", name: file.name });

    try {
      const url = await uploadFile({
        client,
        file,
        projectId: selectedProjectId,
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
        {projects.length === 0 ? (
          <ErrorMessage className="mt-4">
            You need write access to a project to upload media.
          </ErrorMessage>
        ) : null}
        {projects.length > 1 ? (
          <Select
            aria-label="Project"
            className="mt-4"
            selectedKey={selectedProjectId}
            onSelectionChange={(key) => setProjectId(String(key))}
          >
            <SelectButton className="text-sm">
              {projects.find((project) => project.id === selectedProjectId)
                ?.name ?? "Choose a project"}
            </SelectButton>
            <Popover>
              <ListBox items={projects}>
                {(project) => (
                  <ListBoxItem id={project.id}>{project.name}</ListBoxItem>
                )}
              </ListBox>
            </Popover>
          </Select>
        ) : null}
        <Dropzone
          accept={ACCEPTED_TYPES}
          multiple={false}
          disabled={isUploading || !selectedProjectId}
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
  projectId: string;
}): Promise<string> {
  const { client, file, projectId } = args;

  const hash = await hashFile(file);

  const created = await client.mutate({
    mutation: CreateMediaMutation,
    variables: {
      input: {
        projectId,
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
