import { FragmentType, graphql, useFragment } from "@/gql";

import { ImageAvatar } from "./ImageAvatar";
import { InitialAvatar } from "./InitialAvatar";

const AvatarFragment = graphql(`
  fragment AccountAvatarFragment on AccountAvatar {
    url(size: 64)
    color
    initial
  }
`);

export function AccountAvatar(props: {
  ref?: React.Ref<HTMLElement>;
  className?: string;
  size?: number;
  avatar: FragmentType<typeof AvatarFragment>;
  alt?: string;
}) {
  const avatar = useFragment(AvatarFragment, props.avatar);
  const size = props.size ?? 32;
  if (!avatar.url) {
    return (
      <InitialAvatar
        ref={props.ref as React.Ref<HTMLDivElement>}
        initial={avatar.initial}
        color={avatar.color}
        size={size}
        alt={props.alt}
        className={props.className}
      />
    );
  }
  return (
    <ImageAvatar
      ref={props.ref as React.Ref<HTMLImageElement>}
      url={avatar.url}
      size={size}
      className={props.className}
      alt={props.alt}
    />
  );
}
