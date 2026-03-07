import { getKnexConfig } from "./dist/config/database.js";
import config from "./dist/config/index.js";

// Test
export default getKnexConfig(config);
