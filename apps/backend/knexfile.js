import config from "./dist/config.js";
import { getKnexConfig } from "./dist/config/database.js";

export default getKnexConfig(config);
