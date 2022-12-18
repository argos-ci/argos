import Image, { ImageProps } from "next/image";
import { ComponentProps, ReactNode } from "react";

export interface MetadataProps extends ComponentProps<"div"> {}

export const Metadata = (props: MetadataProps) => (
  <div className="flex gap-2 text-slate-400 mb-4" {...props} />
);

export interface MainImageProps extends ImageProps {
  credit: ReactNode;
}

export const MainImage = ({ credit, ...props }: MainImageProps) => (
  <figure>
    <Image
      {...props}
      priority
      className="not-prose object-cover aspect-[2/1] rounded-lg w-full"
      alt="Staircase / eye in library — Photo by Petri Heiskanen"
    />
    <figcaption className="text-center text-sm text-slate-400">
      {credit}
    </figcaption>
  </figure>
);
