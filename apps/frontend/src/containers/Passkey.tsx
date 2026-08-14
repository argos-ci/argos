import { useApolloClient } from "@apollo/client/react";
import { invariant } from "@argos/util/invariant";
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from "@simplewebauthn/browser";
import { KeyRoundIcon } from "lucide-react";

import { graphql } from "@/gql";
import { Button, ButtonIcon, type ButtonProps } from "@/ui/Button";
import { toast } from "@/ui/Toaster";
import { getPostAuthURL } from "@/util/welcome";

/**
 * Shown when a ceremony ends without a credential. Deliberate dismissal, the
 * browser's own timeout and "no passkey on this device" all surface as the same
 * error, so one message has to cover all three.
 */
export const CEREMONY_CANCELLED_MESSAGE =
  "Passkey prompt canceled or timed out. Please try again.";

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
 * Whether the ceremony ended without a credential because the browser/OS prompt
 * was dismissed, timed out, or had no usable passkey for this site.
 *
 * Not our failure, so it is never thrown or logged as one — but it is still
 * reported, because the alternative is a control that acts and then goes quiet.
 * Callers surface `CEREMONY_CANCELLED_MESSAGE` wherever the user is looking.
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
    createPasskeyRegistrationOptions {
      challengeId
      options
    }
  }
`);

const RegisterPasskeyMutation = graphql(`
  mutation Passkey_registerPasskey(
    $challengeId: String!
    $response: JSONObject!
  ) {
    registerPasskey(input: { challengeId: $challengeId, response: $response }) {
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
    invariant(data, "Expected passkey registration options");
    const { challengeId, options } = data.createPasskeyRegistrationOptions;
    const response = await startRegistration({ optionsJSON: options });
    await client.mutate({
      mutation: RegisterPasskeyMutation,
      variables: { challengeId, response },
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
  props: Omit<ButtonProps, "children" | "variant" | "onAsyncAction"> & {
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
      onAsyncAction={async () => {
        const { data } = await client.mutate({
          mutation: CreateAuthenticationOptionsMutation,
        });
        invariant(data, "Expected passkey authentication options");
        const { challengeId, options } =
          data.createPasskeyAuthenticationOptions;

        let response;
        try {
          response = await startAuthentication({ optionsJSON: options });
        } catch (error) {
          if (checkIsCeremonyCancelled(error)) {
            // The same condition covers a deliberate dismissal, the browser's
            // own timeout, and "this device holds no Argos passkey" — they are
            // indistinguishable from here. Saying nothing leaves the button
            // spinning and stopping with no explanation, so the message names
            // the cases the user can act on.
            toast(CEREMONY_CANCELLED_MESSAGE, { id: "passkey-cancelled" });
            return;
          }
          throw error;
        }

        const result = await client.mutate({
          mutation: AuthenticateWithPasskeyMutation,
          variables: { challengeId, response },
        });
        invariant(result.data, "Expected an authentication payload");

        onSuccess?.();
        // The server set the session cookie on the mutation response. Navigate
        // for real so the app re-bootstraps as the logged-in user.
        //
        // The payload is read rather than assumed: `getPostAuthURL` exists so
        // this decision lives in one place, and hardcoding what the server just
        // told us would put it back in two.
        window.location.replace(
          getPostAuthURL({ ...result.data.authenticateWithPasskey, redirect }),
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
