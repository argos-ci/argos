import cors from "cors";

import config from "@/config";

export const allowApp = cors({
  origin: config.get("server.url"),
  // The app authenticates with the session cookie, which the browser only
  // sends/stores on cross-origin requests when credentials are allowed.
  credentials: true,
});
