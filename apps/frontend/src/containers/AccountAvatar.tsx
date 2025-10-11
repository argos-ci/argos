import { DocumentType, graphql } from "@/gql";

import { ImageAvatar } from "./ImageAvatar";
import { InitialAvatar } from "./InitialAvatar";

const _AvatarFragment = graphql(`
  fragment AccountAvatarFragment on AccountAvatar {
    url(size: 144)
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
  const { ref, avatar, alt, className } = props;
  if (!avatar.url) {
    return (
      <InitialAvatar
        ref={ref as React.Ref<HTMLDivElement>}
        initial={avatar.initial}
        color={avatar.color}
        alt={alt}
        className={className}
      />
    );
  }
  return (
    <ImageAvatar
      ref={ref as React.Ref<HTMLImageElement>}
      url={avatar.url}
      className={className}
      alt={alt}
    />
  );
}
