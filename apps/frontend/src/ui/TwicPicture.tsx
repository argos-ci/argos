export function TwicPicture(
  props: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
    transforms?: string[];
    original?: boolean;
  },
) {
  const { src, transforms = [], original, ...rest } = props;
  if (original) {
    return <img src={twic(src, ["format=png", ...transforms])} {...rest} />;
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
        src={twic(src, ["format=png", "quality=90", ...transforms])}
        {...rest}
      />
    </picture>
  );
}

function twic(url: string, transforms: string[]): string {
  return `${url}?twic=v1/${transforms.join("/")}`;
}
