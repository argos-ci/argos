import { useApolloClient } from "@apollo/client/react";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";
import { KeyRoundIcon } from "lucide-react";

import { graphql } from "@/gql";
import { Button, ButtonIcon, type ButtonProps } from "@/ui/Button";
import { getPostAuthURL } from "@/util/welcome";

export function PasskeyIcon(props: React.SVGProps<SVGSVGElement>) {
  return <KeyRoundIcon {...props} />;
}

/**
 * Whether passkeys can be used at all in this browser. Everything passkey is
 * hidden when they cannot, rather than offered and then failing on press.
 */
export function checkPasskeysSupported(): boolean {
  return browserSupportsWebAuthn();
}

/**
 * Whether the user backed out of the browser/OS prompt (cancelled it, let it
 * time out, or has no usable passkey for this site).
 *
 * Not a failure worth reporting: the user already knows they dismissed it, so
 * the caller returns to its idle state silently.
 */
export function checkIsCeremonyCancelled(error: unknown): boolean {
  if (error instanceof WebAuthnError) {
    return (
      error.code === "ERROR_CEREMONY_ABORTED" ||
      checkIsCeremonyCancelled(error.cause)
    );
  }
  return (
    error instanceof Error &&
    (error.name === "NotAllowedError" || error.name === "AbortError")
  );
}

const CreateAuthenticationOptionsMutation = graphql(`
  mutation Passkey_createPasskeyAuthenticationOptions {
    createPasskeyAuthenticationOptions {
      challengeId
      options
    }
  }
`);

const AuthenticateWithPasskeyMutation = graphql(`
  mutation Passkey_authenticateWithPasskey(
    $challengeId: String!
    $response: JSONObject!
  ) {
    authenticateWithPasskey(
      input: { challengeId: $challengeId, response: $response }
    ) {
      creation
      hasAutoInvite
    }
  }
`);

const CreateRegistrationOptionsMutation = graphql(`
  mutation Passkey_createPasskeyRegistrationOptions {
    createPasskeyRegistrationOptions
  }
`);

const RegisterPasskeyMutation = graphql(`
  mutation Passkey_registerPasskey($response: JSONObject!) {
    registerPasskey(input: { response: $response }) {
      id
      name
      createdAt
      lastUsedAt
      synced
    }
  }
`);

/**
 * Run a full passkey registration ceremony for the signed-in user: ask the
 * server for the options, let the authenticator create the credential, then hand
 * the result back to be verified and stored.
 *
 * The `passkeys` list of the current user is refetched rather than patched, so
 * the settings list reflects the new credential wherever it is rendered.
 */
export function useRegisterPasskey(): () => Promise<void> {
  const client = useApolloClient();
  return async () => {
    const { data } = await client.mutate({
      mutation: CreateRegistrationOptionsMutation,
    });
    if (!data) {
      throw new Error("Failed to start the passkey registration");
    }
    const response = await startRegistration({
      optionsJSON: data.createPasskeyRegistrationOptions,
    });
    await client.mutate({
      mutation: RegisterPasskeyMutation,
      variables: { response },
      refetchQueries: ["AccountSettings_account"],
      awaitRefetchQueries: true,
    });
  };
}

/**
 * "Continue with Passkey": no email typed first — the credentials are
 * discoverable, so the authenticator offers the accounts it holds for Argos and
 * the user picks one.
 */
export function PasskeyLoginButton(
  props: Omit<ButtonProps, "children" | "variant" | "onAction"> & {
    children?: React.ReactNode;
    redirect?: string | null;
    onSuccess?: () => void;
  },
) {
  const { children, redirect, onSuccess, ...rest } = props;
  const client = useApolloClient();

  return (
    <Button
      variant="secondary"
      {...rest}
      onAction={async () => {
        const { data } = await client.mutate({
          mutation: CreateAuthenticationOptionsMutation,
        });
        if (!data) {
          throw new Error("Failed to start the passkey login");
        }
        const { challengeId, options } =
          data.createPasskeyAuthenticationOptions;

        let response;
        try {
          response = await startAuthentication({ optionsJSON: options });
        } catch (error) {
          if (checkIsCeremonyCancelled(error)) {
            return;
          }
          throw error;
        }

        await client.mutate({
          mutation: AuthenticateWithPasskeyMutation,
          variables: { challengeId, response },
        });

        onSuccess?.();
        // The server set the session cookie on the mutation response. Navigate
        // for real so the app re-bootstraps as the logged-in user.
        window.location.replace(
          getPostAuthURL({
            creation: false,
            hasAutoInvite: false,
            redirect,
          }),
        );
      }}
    >
      <ButtonIcon>
        <PasskeyIcon />
      </ButtonIcon>
      {children ?? "Continue with Passkey"}
    </Button>
  );
}
