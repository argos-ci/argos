import { checkIsImageKitUrl } from "@/util/image";

export type ImageKitPictureProps = React.ComponentPropsWithRef<"img"> & {
  src: string;
  parameters?: string[];
  original?: boolean;
};

export function ImageKitPicture(props: ImageKitPictureProps) {
  const { ref, src, parameters = [], original, ...rest } = props;

  if (!checkIsImageKitUrl(src)) {
    return <img ref={ref} src={src} {...rest} />;
  }

  if (original) {
    return <img ref={ref} src={imgkit(src, ["tr=orig-true"])} {...rest} />;
  }
  return (
    <picture>
      <source
        srcSet={imgkit(src, ["f=avif", "q=90", ...parameters])}
        type="image/avif"
      />
      <source
        srcSet={imgkit(src, ["f=webp", "q=90", ...parameters])}
        type="image/webp"
      />
      <source
        srcSet={imgkit(src, ["f=png", "q=90", ...parameters])}
        type="image/png"
      />
      <img
        ref={ref}
        src={imgkit(src, ["f=png", "q=90", ...parameters])}
        {...rest}
      />
    </picture>
  );
}

function imgkit(url: string, parameters: string[]): string {
  if (!checkIsImageKitUrl(url)) {
    return url;
  }
  return `${url}?${parameters.join("&")}`;
}
