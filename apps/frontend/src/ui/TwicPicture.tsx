import { forwardRef } from "react";

import { checkIsTwicPicsUrl } from "@/util/image";

export type TwicPictureProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  transforms?: string[];
  original?: boolean;
};

export const TwicPicture = forwardRef(function TwicPicture(
  props: TwicPictureProps,
  ref: React.ForwardedRef<HTMLImageElement>,
) {
  const { src, transforms = [], original, ...rest } = props;

  if (!checkIsTwicPicsUrl(src)) {
    return <img ref={ref} src={src} {...rest} />;
  }

  if (original) {
    return (
      <img
        ref={ref}
        src={twic(src, ["format=png", "noop", ...transforms])}
        {...rest}
      />
    );
  }
  return (
    <picture>
      <source
        srcSet={twic(src, ["format=avif", "quality=90", ...transforms])}
        type="image/avif"
      />
      <source
        srcSet={twic(src, ["format=webp", "quality=90", ...transforms])}
        type="image/webp"
      />
      <source
        srcSet={twic(src, ["format=png", "quality=90", ...transforms])}
        type="image/png"
      />
      <img
        ref={ref}
        src={twic(src, ["format=png", "quality=90", ...transforms])}
        {...rest}
      />
    </picture>
  );
});

function twic(url: string, transforms: string[]): string {
  return `${url}?twic=v1/${transforms.join("/")}`;
}
