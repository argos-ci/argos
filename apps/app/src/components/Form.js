import * as React from "react";
import { x } from "@xstyled/styled-components";
import {
  Form as AriakitForm,
  FormError as AriakitFormError,
  FormInput as AriakitFormInput,
  FormLabel as AriakitFormLabel,
  FormReset as AriakitFormReset,
  FormSubmit as AriakitFormSubmit,
  useFormState,
} from "ariakit/form";
import { Input } from "./Input";
import { Button } from "./Button";
import { Alert } from "./Alert";

export { useFormState };

export const Form = (props) => (
  <x.div
    as={AriakitForm}
    display="flex"
    flexDirection="column"
    gap={4}
    {...props}
  />
);

export const FormError = (props) => {
  return <AriakitFormError as={Alert} severity="error" mt={2} {...props} />;
};

export const FormInput = (props) => <Input as={AriakitFormInput} {...props} />;

export const FormLabel = ({ required, children, ...props }) => (
  <x.div as={AriakitFormLabel} fontWeight={600} {...props}>
    {children}
    {required ? <x.span color="red-500">*</x.span> : null}
  </x.div>
);

export const FormReset = (props) => (
  <x.Button variant="gray" as={AriakitFormReset} {...props} />
);

export const FormSubmit = React.forwardRef(
  ({ children, as, disabled, ...props }, ref) => {
    return (
      <AriakitFormSubmit ref={ref} {...props}>
        {(submitProps) => (
          <Button {...submitProps} as={as} disabled={disabled}>
            {children}
          </Button>
        )}
      </AriakitFormSubmit>
    );
  }
);
