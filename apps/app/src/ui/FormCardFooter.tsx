import { CardFooter } from "./Card";
import { FormRootError } from "./FormRootError";
import { FormSubmit } from "./FormSubmit";
import { FormSuccess } from "./FormSuccess";

export type FormCardFooterProps = {
  children?: React.ReactNode;
};

export const FormCardFooter = (props: FormCardFooterProps) => {
  return (
    <CardFooter className="flex items-center justify-between">
      {props.children}
      <div className="flex items-center justify-end gap-4">
        <FormRootError />
        <FormSuccess>Saved</FormSuccess>
        <FormSubmit />
      </div>
    </CardFooter>
  );
};
