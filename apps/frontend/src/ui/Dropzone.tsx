/* eslint-disable react-hooks/refs */
import type { ComponentPropsWithRef } from "react";
import clsx from "clsx";
import { useDropzone, type DropzoneOptions } from "react-dropzone";

export type DropzoneProps = Pick<
  DropzoneOptions,
  "accept" | "multiple" | "onDrop"
> &
  Pick<ComponentPropsWithRef<"div">, "ref" | "onBlur" | "className"> & {
    invalid?: boolean;
    name?: string;
    children: (args: {
      isDragAccept: boolean;
      isDragReject: boolean;
    }) => React.ReactNode;
    disabled?: boolean;
  };

export function Dropzone(props: DropzoneProps) {
  const {
    ref,
    onBlur,
    accept,
    multiple,
    onDrop,
    invalid,
    name,
    children,
    disabled,
    className,
  } = props;
  const { getRootProps, getInputProps, isDragAccept, isDragReject } =
    useDropzone({ accept, multiple, onDrop, disabled });
  return (
    <div
      {...getRootProps({ ref, onBlur })}
      className={clsx(
        "rounded border border-dashed p-4 text-center text-sm ring-offset-2 select-none focus:ring-2 focus:outline-none",
        invalid
          ? "border-danger hover:border-danger-active text-danger-low ring-danger"
          : clsx(
              "hover:border-active text-low ring-primary",
              isDragAccept && "border-success text-success-low ring-success",
              isDragReject && "border-danger text-danger-low ring-danger",
            ),
        disabled && "opacity-disabled",
        className,
      )}
    >
      <input {...getInputProps({ name })} />
      {children({ isDragAccept, isDragReject })}
    </div>
  );
}
