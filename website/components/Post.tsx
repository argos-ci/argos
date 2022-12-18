import Image, { ImageProps } from "next/image";
import { ComponentProps, ReactNode } from "react";

export interface MetadataProps extends ComponentProps<"div"> {}

export const Metadata = (props: MetadataProps) => (
  <div className="flex gap-2 text-on-light mb-4" {...props} />
);

export interface MainImageProps extends ImageProps {
  credit: ReactNode;
}

export const MainImage = ({ credit, ...props }: MainImageProps) => (
  <figure>
    <Image
      {...props}
      priority
      className="not-prose rounded-lg"
      style={{
        objectFit: "cover",
        aspectRatio: "2/1",
        width: "100%",
        height: "auto",
      }}
      alt="Staircase / eye in library — Photo by Petri Heiskanen"
    />
    <figcaption className="text-center text-sm text-on-light">
      {credit}
    </figcaption>
  </figure>
);
