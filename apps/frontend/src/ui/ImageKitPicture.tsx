import { checkIsImageKitUrl } from "@/util/image";

export type ImageKitPictureProps = React.ComponentPropsWithRef<"img"> & {
  src: string;
  transformations?: string[];
  original?: boolean;
};

export function ImageKitPicture(props: ImageKitPictureProps) {
  const { ref, src, transformations = [], original, ...rest } = props;

  if (!checkIsImageKitUrl(src)) {
    return <img ref={ref} src={src} {...rest} />;
  }

  if (original) {
    return <img ref={ref} src={imgkit(src, ["orig-true"])} {...rest} />;
  }
  return (
    <picture className="contents">
      <source
        srcSet={imgkit(src, [...transformations, "f-avif", "q-90"])}
        type="image/avif"
      />
      <source
        srcSet={imgkit(src, [...transformations, "f-webp", "q-90"])}
        type="image/webp"
      />
      <source
        srcSet={imgkit(src, [...transformations, "f-png", "q-90"])}
        type="image/png"
      />
      <img
        ref={ref}
        src={imgkit(src, [...transformations, "f-png", "q-90"])}
        {...rest}
      />
    </picture>
  );
}

export function imgkit(url: string, transformations: string[]): string {
  if (!checkIsImageKitUrl(url) || transformations.length === 0) {
    return url;
  }
  return `${url}?tr=${transformations.join(",")}`;
}
