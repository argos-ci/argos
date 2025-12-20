import { readFile } from "node:fs/promises";
import { deleteAsync } from "del";

const lines = await readFile(".deployignore", "utf8");
const files = lines.split("\n").filter(Boolean);

await deleteAsync(files);
