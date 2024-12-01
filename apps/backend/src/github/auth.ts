import axios from "axios";
import { z } from "zod";

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
  const result = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
    },
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  return RetrieveTokenResponseSchema.parse(result.data);
}
