import { forwardRef } from "react";

export const TwicPicture = forwardRef(function TwicPicture(
  props: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    transforms?: string[];
    original?: boolean;
  },
  ref: React.Ref<HTMLImageElement>,
) {
  const { src, transforms = [], original, ...rest } = props;
  if (original) {
    return (
      <img ref={ref} src={twic(src, ["format=png", ...transforms])} {...rest} />
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
