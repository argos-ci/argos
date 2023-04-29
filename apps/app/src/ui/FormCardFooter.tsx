import { CardFooter } from "./Card";
import { FormRootError } from "./FormRootError";
import { FormSubmit } from "./FormSubmit";
import { FormSuccess } from "./FormSuccess";

export const FormCardFooter = () => {
  return (
    <CardFooter className="flex items-center justify-end gap-4">
      <FormRootError />
      <FormSuccess>Saved</FormSuccess>
      <FormSubmit />
    </CardFooter>
  );
};
