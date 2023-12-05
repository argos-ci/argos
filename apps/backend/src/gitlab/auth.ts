import axios from "axios";
import { z } from "zod";

const RetrieveTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  created_at: z.number(),
});

export async function retrieveOAuthToken(args: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  const result = await axios.post(
    "https://gitlab.com/oauth/token",
    {
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
      grant_type: "authorization_code",
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
