import Image from "next/image";

export const PostCard = ({
  extended,
  children,
}: {
  extended?: Boolean;
  children: React.ReactNode;
}) => (
  <div
    className={`rounded-lg shadow-md text-left ${extended ? "col-span-2" : ""}`}
  >
    {children}
  </div>
);

export const PostCardImage = ({
  alt,
  src,
  extended,
}: {
  extended?: Boolean;
  alt: string;
  src: string;
}) => {
  const width = extended ? 990 : 800;
  const height = extended ? width / (16 / 9) : width / (2 / 1);

  return (
    <Image
      className="rounded-t-lg"
      width={width}
      height={height}
      alt={alt}
      src={src}
      priority={Boolean(extended)}
    />
  );
};

export const PostCardBody: React.FC<{ children: React.ReactNode }> = (
  props
) => <div className="py-4" {...props} />;

export const PostCardTag: React.FC<{ children: React.ReactNode }> = (props) => (
  <p className="text-xs text-slate-400 mb-2" {...props} />
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
      extended ? "text-2xl" : "text-4xl"
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
) => <div className="text-slate-400" {...props} />;
