import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";

import { schema } from "../schema";

/**
 * Generate the OpenAPI specification from the Zod schema and write it to disk as
 * YAML. Handy for debugging the spec or previewing it in an external tool (e.g.
 * the Swagger editor or GitBook) without running the server.
 *
 * Usage: `node dist/api/bin/generate-openapi.js [output-path]`
 * Defaults to `openapi.yaml` in the current working directory.
 */
const outputPath = resolve(process.cwd(), process.argv[2] ?? "openapi.yaml");

const yamlSchema = stringify(schema, { aliasDuplicateObjects: false });

writeFileSync(outputPath, yamlSchema);

console.log(`OpenAPI specification written to ${outputPath}`);
process.exit(0);
