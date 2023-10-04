import axios from "axios";
import { z } from "zod";

const RetrieveTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("bearer"),
  scope: z.string(),
});

export type RetrieveTokenResponse = z.infer<typeof RetrieveTokenResponseSchema>;

export async function retrieveOAuthToken(args: {
  clientId: string;
  clientSecret: string;
  code: string;
}) {
  const result = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
    },
    {
      headers: {
        accept: "application/json",
      },
    },
  );

  return RetrieveTokenResponseSchema.parse(result.data);
}
