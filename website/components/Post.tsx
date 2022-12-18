import Image, { ImageProps } from "next/image";
import { ComponentProps, ReactNode } from "react";

export interface MetadataProps extends ComponentProps<"div"> {}

export const Metadata = (props: MetadataProps) => (
  <div className="flex gap-2 text-on-light mb-4" {...props} />
);

export interface MainImageProps extends ImageProps {
  credit: ReactNode;
}

export const MainImage = ({
  credit,
  width,
  height,
  ...props
}: MainImageProps) => (
  <figure>
    <div
      className="not-prose rounded-lg"
      style={{
        aspectRatio: "2/1",
        position: "relative",
      }}
    >
      <Image
        {...props}
        priority
        fill
        alt="Staircase / eye in library — Photo by Petri Heiskanen"
        style={{
          objectFit: "cover",
        }}
      />
    </div>
    <figcaption className="text-center text-sm text-on-light">
      {credit}
    </figcaption>
  </figure>
);
