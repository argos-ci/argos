import { forwardRef } from "react";

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

export const AccountAvatar = forwardRef<
  any,
  {
    className?: string;
    size?: number;
    avatar: FragmentType<typeof AvatarFragment>;
  }
>((props, ref) => {
  const avatar = useFragment(AvatarFragment, props.avatar);
  const size = props.size ?? 32;
  if (!avatar.url) {
    return (
      <InitialAvatar
        ref={ref}
        initial={avatar.initial}
        color={avatar.color}
        size={size}
        className={props.className}
      />
    );
  }
  return (
    <ImageAvatar url={avatar.url} size={size} className={props.className} />
  );
});
