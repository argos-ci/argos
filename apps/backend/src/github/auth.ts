import axios from "axios";
import { z } from "zod";

import logger from "@/logger";

const RetrieveTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  scope: z.string(),
});

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

  const result = await axios.post(
    "https://github.com/login/oauth/access_token",
    body,
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  try {
    return RetrieveTokenResponseSchema.parse(result.data);
  } catch (error) {
    logger.info("GitHub OAuth response errored", {
      status: result.status,
      data: result.data,
    });
    throw new Error("Failed to parse GitHub OAuth response", {
      cause: error,
    });
  }
}
