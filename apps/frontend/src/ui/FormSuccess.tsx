import { use, type ComponentPropsWithRef } from "react";
import { invariant } from "@argos/util/invariant";
import { clsx } from "clsx";
import { CheckIcon } from "lucide-react";

import { FormSubmitSuccessContext } from "./Form";

interface FormSuccessProps extends ComponentPropsWithRef<"div"> {
  isSuccessful?: boolean;
}

export function FormSuccess(props: FormSuccessProps) {
  const { className, children, isSuccessful, ...otherProps } = props;
  const isSubmitSuccessful = use(FormSubmitSuccessContext);
  invariant(
    isSubmitSuccessful !== null,
    "FormSuccess must be rendered inside a Form",
  );
  if (!isSuccessful && !isSubmitSuccessful) {
    return null;
  }
  return (
    <div
      className={clsx(className, "flex items-center gap-2 font-medium")}
      role="status"
      {...otherProps}
    >
      <CheckIcon className="text-success size-4" />
      {children}
    </div>
  );
}
