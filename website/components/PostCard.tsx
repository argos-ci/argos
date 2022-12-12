import Image, { ImageProps } from "next/image";
import { clsx } from "clsx";

export const PostCard = ({
  extended,
  children,
}: {
  extended?: Boolean;
  children: React.ReactNode;
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
      className={clsx(
        "object-cover rounded-t-lg overflow-hidden w-full",
        extended ? "aspect-[21/9]" : "aspect-[2/1]"
      )}
    />
  );
};

export const PostCardBody: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="py-4" {...props} />;

export const PostCardTag: React.FC<{ children: React.ReactNode }> = (props) => (
  <p className="text-xs text-on-light mb-2" {...props} />
);

export const PostCardTitle = ({
  extended,
  children,
}: {
  extended?: Boolean;
  children: React.ReactNode;
}) => (
  <h2
    className={`mb-2 ${
      extended ? "text-4xl" : "text-2xl"
    } font-bold text-white`}
  >
    {children}
  </h2>
);

export const PostCardDescription: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="mb-8 text-gray-100 leading-normal" {...props} />;

export const PostCardFooter: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="text-sm text-gray-100 flex gap-2" {...props} />;

export const PostCardAuthor: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="text-slate-100" {...props} />;

export const PostCardDate: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="text-on-light" {...props} />;
