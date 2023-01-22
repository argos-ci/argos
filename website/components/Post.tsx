import Image, { ImageProps } from "next/image";
import { ReactNode } from "react";

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
        overflow: "hidden",
      }}
    >
      <Image
        {...props}
        priority
        fill
        alt="Staircase / eye in library — Photo by Petri Heiskanen"
        style={{
          objectFit: "cover",
          overflow: "hidden",
        }}
      />
    </div>
    <figcaption className="text-center text-sm text-on-light">
      {credit}
    </figcaption>
  </figure>
);
