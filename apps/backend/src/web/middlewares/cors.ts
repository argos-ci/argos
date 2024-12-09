import cors from "cors";

import config from "@/config/index.js";

export const allowApp = cors({ origin: config.get("server.url") });
