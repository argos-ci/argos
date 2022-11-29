import { HTMLProps } from "react";

export const Card = (props: HTMLProps<HTMLDivElement>) => {
  return (
    <div
      className="w-full overflow-hidden rounded border border-border"
      {...props}
    />
  );
};

export const CardBody = (props: HTMLProps<HTMLDivElement>) => {
  return <div className="font-ms p-4" {...props} />;
};

export const CardFooter = (props: HTMLProps<HTMLDivElement>) => {
  return <div className="bg-slate-900/70 p-4 text-sm" {...props} />;
};

export const CardTitle = (props: HTMLProps<HTMLDivElement>) => {
  return <h2 className="mb-4 text-xl font-semibold" {...props} />;
};
