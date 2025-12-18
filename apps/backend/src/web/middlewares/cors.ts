import cors from "cors";

import config from "@/config";

export const allowApp = cors({ origin: config.get("server.url") });
