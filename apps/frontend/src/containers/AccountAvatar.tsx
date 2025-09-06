import { DocumentType, graphql } from "@/gql";

import { ImageAvatar } from "./ImageAvatar";
import { InitialAvatar } from "./InitialAvatar";

const _AvatarFragment = graphql(`
  fragment AccountAvatarFragment on AccountAvatar {
    url(size: 64)
    color
    initial
  }
`);

export function AccountAvatar(props: {
  ref?: React.Ref<HTMLElement>;
  className?: string;
  avatar: DocumentType<typeof _AvatarFragment>;
  alt?: string;
}) {
  const { avatar } = props;
  if (!avatar.url) {
    return (
      <InitialAvatar
        ref={props.ref as React.Ref<HTMLDivElement>}
        initial={avatar.initial}
        color={avatar.color}
        alt={props.alt}
        className={props.className}
      />
    );
  }
  return (
    <ImageAvatar
      ref={props.ref as React.Ref<HTMLImageElement>}
      url={avatar.url}
      className={props.className}
      alt={props.alt}
    />
  );
}
