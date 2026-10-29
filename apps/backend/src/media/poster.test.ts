import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { readPosterFrame } from "./poster";

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: "#808080" },
  })
    .jpeg()
    .toBuffer();
}

describe("readPosterFrame", () => {
  it("reads the frame's size off a served image", async () => {
    const response = new Response(new Uint8Array(await jpeg(786, 224)), {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
    await expect(readPosterFrame(response)).resolves.toMatchObject({
      contentType: "image/jpeg",
      width: 786,
      height: 224,
    });
  });

  it("is not ready while the CDN is still preparing the frame", async () => {
    // What ImageKit answered for more than a quarter of an hour on 2026-10-29.
    const response = new Response(
      "<html>The asset is currently being prepared</html>",
      { status: 202, headers: { "content-type": "text/html" } },
    );
    await expect(readPosterFrame(response)).resolves.toBeNull();
  });

  it("is not ready when the CDN cannot take a frame from the file", async () => {
    const response = new Response("<html>Bad request</html>", {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    await expect(readPosterFrame(response)).resolves.toBeNull();
  });

  it("does not take a 200 that is not an image for a frame", async () => {
    const response = new Response("<html></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
    await expect(readPosterFrame(response)).resolves.toBeNull();
  });
});
