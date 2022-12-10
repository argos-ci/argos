import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { LocalImageFile } from "./S3Image.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("LocalImageFile", () => {
  it("measures large image", async () => {
    const image = new LocalImageFile({
      filepath: join(__dirname, "__fixtures__", "long-image.png"),
    });
    await expect(image.getDimensions()).resolves.toEqual({
      height: 20480,
      width: 281,
    });
  });
});
