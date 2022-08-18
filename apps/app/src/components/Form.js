import React from "react";
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
    gap={2}
    {...props}
  />
);

export const FormError = (props) => {
  return <AriakitFormError as={Alert} severity="error" {...props} />;
};

export const FormInput = (props) => <Input as={AriakitFormInput} {...props} />;

export const FormLabel = (props) => (
  <x.div as={AriakitFormLabel} fontWeight={600} {...props} />
);

export const FormReset = (props) => (
  <x.Button variant="gray" as={AriakitFormReset} {...props} />
);

export const FormSubmit = (props) => (
  <Button variant="primary" as={AriakitFormSubmit} {...props} />
);
