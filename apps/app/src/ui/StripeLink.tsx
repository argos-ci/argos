import { LinkExternalIcon } from "@primer/octicons-react";
import { clsx } from "clsx";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";

import { useAuth } from "@/containers/Auth";

import { Button } from "./Button";
import { Form } from "./Form";
import { anchorClassNames } from "./Link";

const postJson = async ({
  url,
  token = null,
  data,
}: {
  url: string;
  token?: string | null;
  data: any;
}) => {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(data),
  });
};

type StripePortalFormInputs = {
  stripeCustomerId: string;
};

export const StripePortalLink = ({
  stripeCustomerId,
  children,
  buttonDesign = false,
}: {
  stripeCustomerId: string;
  children: React.ReactNode;
  buttonDesign?: boolean;
}) => {
  const form = useForm<StripePortalFormInputs>({
    defaultValues: { stripeCustomerId },
  });

  const onSubmit: SubmitHandler<StripePortalFormInputs> = async (data: any) => {
    const response = await postJson({
      url: "/stripe/create-customer-portal-session",
      data,
    });
    const json = await response.json();
    if (response.ok) {
      window.location.href = json.sessionUrl;
    } else {
      console.error("Error:", json.message);
    }
  };

  return (
    <FormProvider {...form}>
      <Form onSubmit={onSubmit}>
        {buttonDesign ? (
          <Button type="submit" variant="outline" color="neutral">
            {children}
          </Button>
        ) : (
          <button
            type="submit"
            className={clsx(anchorClassNames, "inline-flex items-center")}
          >
            {children}
            <LinkExternalIcon className="ml-[0.5ex] h-[1em] w-[1em]" />
          </button>
        )}

        <input
          type="hidden"
          {...form.register("stripeCustomerId", {
            required: "stripeCustomerId is required",
          })}
        />
      </Form>
    </FormProvider>
  );
};

type StripeCheckoutFormInputs = {
  accountId: string;
};

export const StripeCheckoutButton = ({
  accountId,
  children,
}: {
  accountId: string;
  children: React.ReactNode;
}) => {
  const { token } = useAuth();

  const form = useForm<StripeCheckoutFormInputs>({
    defaultValues: { accountId },
  });

  const onSubmit: SubmitHandler<StripeCheckoutFormInputs> = async (
    data: any
  ) => {
    const response = await postJson({
      url: "/stripe/create-checkout-session",
      data,
      token,
    });
    const json = await response.json();
    if (response.ok) {
      window.location.href = json.sessionUrl;
    } else {
      console.error("Error:", json.message);
    }
  };

  return (
    <FormProvider {...form}>
      <Form onSubmit={onSubmit}>
        <Button type="submit" variant="outline" color="neutral">
          {children}
        </Button>
        <input
          type="hidden"
          {...form.register("accountId", {
            required: "accountId is required",
          })}
        />
      </Form>
    </FormProvider>
  );
};
