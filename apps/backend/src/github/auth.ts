import { assertNever } from "@argos/util/assertNever";
import axios from "axios";
import { z } from "zod";

import logger from "@/logger";
import { boom } from "@/web/util";

const RetrieveTokenErrorSchema = z.enum([
  "incorrect_client_credentials",
  "redirect_uri_mismatch",
  "bad_verification_code",
  "unverified_user_email",
]);

const RetrieveTokenResponseSchema = z.union([
  z.object({
    access_token: z.string(),
    token_type: z.literal("bearer"),
    scope: z.string(),
  }),
  z.object({
    error: RetrieveTokenErrorSchema,
    error_description: z.string(),
    error_uri: z.string(),
  }),
]);

/**
 * Get the error code from the GitHub OAuth error response.
 */
function getErrorCode(authError: z.infer<typeof RetrieveTokenErrorSchema>) {
  switch (authError) {
    case "incorrect_client_credentials":
      return "GITHUB_AUTH_INCORRECT_CLIENT_CREDENTIALS";
    case "redirect_uri_mismatch":
      return "GITHUB_AUTH_REDIRECT_URI_MISMATCH";
    case "bad_verification_code":
      return "GITHUB_AUTH_BAD_VERIFICATION_CODE";
    case "unverified_user_email":
      return "GITHUB_AUTH_UNVERIFIED_USER_EMAIL";
    default:
      assertNever(authError);
  }
}

export async function retrieveOAuthToken(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const body = {
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    redirect_uri: args.redirectUri,
  };

  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    body,
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  const data = (() => {
    try {
      return RetrieveTokenResponseSchema.parse(response.data);
    } catch (error) {
      logger.info("GitHub OAuth response errored", {
        status: response.status,
        data: response.data,
      });
      throw new Error("Failed to parse GitHub OAuth response", {
        cause: error,
      });
    }
  })();

  if ("error" in data) {
    throw boom(400, data.error_description, {
      code: getErrorCode(data.error),
    });
  }

  return data;
}
