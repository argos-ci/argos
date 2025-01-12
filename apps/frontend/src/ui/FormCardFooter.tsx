import { CardFooter } from "./Card";
import { FormRootError } from "./FormRootError";
import { FormSubmit } from "./FormSubmit";
import { FormSuccess } from "./FormSuccess";

export function FormCardFooter(props: {
  children?: React.ReactNode;
  isDisabled?: boolean;
  isSuccessful?: boolean;
  disableIfDirty?: boolean;
}) {
  return (
    <CardFooter className="flex items-center justify-between gap-4">
      <div>{props.children}</div>
      <div className="flex items-center justify-end gap-4">
        <FormRootError />
        <FormSuccess isSuccessful={props.isSuccessful}>Saved</FormSuccess>
        <FormSubmit
          isDisabled={props.isDisabled}
          disableIfDirty={props.disableIfDirty}
        />
      </div>
    </CardFooter>
  );
}
