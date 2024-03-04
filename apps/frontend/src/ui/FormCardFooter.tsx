import { CardFooter } from "./Card";
import { FormRootError } from "./FormRootError";
import { FormSubmit } from "./FormSubmit";
import { FormSuccess } from "./FormSuccess";

export const FormCardFooter = (props: {
  children?: React.ReactNode;
  disabled?: boolean;
}) => {
  return (
    <CardFooter className="flex items-center justify-between">
      <div>{props.children}</div>
      <div className="flex items-center justify-end gap-4">
        <FormRootError />
        <FormSuccess>Saved</FormSuccess>
        <FormSubmit disabled={props.disabled} />
      </div>
    </CardFooter>
  );
};
