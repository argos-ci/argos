import { useId, useRef, useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { clsx } from "clsx";
import { ImageUpIcon } from "lucide-react";

import { AccountAvatar } from "@/containers/AccountAvatar";
import { useUploadFile } from "@/containers/FileUpload";
import { DocumentType, graphql } from "@/gql";
import { Button } from "@/ui/Button";
import {
  Card,
  CardBody,
  CardFooter,
  CardParagraph,
  CardTitle,
} from "@/ui/Card";
import { Loader } from "@/ui/Loader";
import { toast } from "@/ui/Toaster";
import { getErrorMessage } from "@/util/error";

const _TeamFragment = graphql(`
  fragment TeamChangeAvatar_Team on Team {
    id
    hasCustomAvatar
    avatar {
      ...AccountAvatarFragment
    }
  }
`);

const SetTeamAvatarMutation = graphql(`
  mutation TeamChangeAvatar_set($teamAccountId: ID!, $uploadKey: String!) {
    setTeamAvatar(
      input: { teamAccountId: $teamAccountId, uploadKey: $uploadKey }
    ) {
      ...TeamChangeAvatar_Team
    }
  }
`);

const RemoveTeamAvatarMutation = graphql(`
  mutation TeamChangeAvatar_remove($teamAccountId: ID!) {
    removeTeamAvatar(input: { teamAccountId: $teamAccountId }) {
      ...TeamChangeAvatar_Team
    }
  }
`);

export function TeamChangeAvatar(props: {
  team: DocumentType<typeof _TeamFragment>;
}) {
  const { team } = props;
  const client = useApolloClient();
  const uploadFile = useUploadFile();
  return (
    <TeamAvatarCard
      avatar={team.avatar}
      hasCustomAvatar={team.hasCustomAvatar}
      onUpload={async (file) => {
        const uploadKey = await uploadFile(file);
        await client.mutate({
          mutation: SetTeamAvatarMutation,
          variables: { teamAccountId: team.id, uploadKey },
        });
        toast.success("Team avatar updated");
      }}
      onRemove={async () => {
        await client.mutate({
          mutation: RemoveTeamAvatarMutation,
          variables: { teamAccountId: team.id },
        });
        toast.success("Team avatar removed");
      }}
    />
  );
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function TeamAvatarCard(props: {
  avatar: DocumentType<typeof _TeamFragment>["avatar"];
  hasCustomAvatar: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const { avatar, hasCustomAvatar, onUpload, onRemove } = props;
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File) => {
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardBody className="flex items-start justify-between gap-6">
        <div>
          <CardTitle id={headingId}>Team Avatar</CardTitle>
          <CardParagraph>
            This is your team's avatar. Click it to upload an image.
          </CardParagraph>
        </div>
        <button
          type="button"
          aria-label="Upload team avatar"
          aria-disabled={isUploading || undefined}
          className="group focus-visible:ring-primary relative size-20 shrink-0 rounded-full ring-offset-2 focus:outline-none focus-visible:ring-2"
          onClick={() => {
            if (!isUploading) {
              inputRef.current?.click();
            }
          }}
        >
          <AccountAvatar avatar={avatar} className="size-20" />
          <span
            className={clsx(
              "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity",
              isUploading
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            {isUploading ? (
              <Loader delay={0} className="size-6" />
            ) : (
              <ImageUpIcon className="size-6" />
            )}
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared so that picking the same file again still uploads it.
            event.target.value = "";
            if (file) {
              void upload(file);
            }
          }}
        />
      </CardBody>
      <CardFooter className="flex items-center justify-between gap-4">
        <div>Square images work best.</div>
        {hasCustomAvatar ? (
          <Button
            variant="secondary"
            onAsyncAction={onRemove}
            disabled={isUploading}
          >
            Remove
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
