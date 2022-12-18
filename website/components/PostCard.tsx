import type { ComponentProps, ReactNode } from "react";
import Image, { ImageProps } from "next/image";
import { clsx } from "clsx";

export const PostCard = ({
  extended,
  children,
}: {
  extended?: Boolean;
  children: ReactNode;
}) => (
  <div
    className={clsx("rounded-lg shadow-md text-left", extended && "col-span-2")}
  >
    {children}
  </div>
);

export interface PostCardImageProps extends ImageProps {
  extended?: Boolean;
}

export const PostCardImage = ({
  extended,
  alt,
  ...props
}: PostCardImageProps) => {
  return (
    <Image
      {...props}
      priority={Boolean(extended)}
      alt={alt}
      className="rounded-t-lg"
      style={{
        objectFit: "cover",
        aspectRatio: extended ? "21/9" : "2/1",
        width: "100%",
        height: "auto",
      }}
    />
  );
};

export const PostCardBody = (props: ComponentProps<"div">) => (
  <div className="py-4" {...props} />
);

export const PostCardTag: React.FC<{ children: React.ReactNode }> = (props) => (
  <p className="text-xs text-on-light mb-2" {...props} />
);

export const PostCardTitle = ({
  extended,
  children,
}: {
  extended?: Boolean;
  children: ReactNode;
}) => (
  <h2
    className={`mb-2 ${
      extended ? "text-4xl" : "text-2xl"
    } font-bold text-white`}
  >
    {children}
  </h2>
);

export const PostCardDescription = (props: ComponentProps<"div">) => (
  <div className="mb-8 text-slate-100 leading-normal" {...props} />
);

export const PostCardFooter = (props: ComponentProps<"div">) => (
  <div className="text-sm text-slate-100 flex gap-2" {...props} />
);

export const PostCardAuthor = (props: ComponentProps<"div">) => (
  <div className="text-slate-100" {...props} />
);

export const PostCardDate: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="text-on-light" {...props} />;
