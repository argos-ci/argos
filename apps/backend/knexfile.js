import { getKnexConfig } from "./dist/config/database.js";
import config from "./dist/config/index.js";

export default getKnexConfig(config);
