import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { renderAvatarImage } from "./avatar-image";

function image(args: {
  width: number;
  height: number;
  format: "png" | "jpeg" | "webp" | "gif" | "avif";
  background?: string;
}) {
  return sharp({
    create: {
      width: args.width,
      height: args.height,
      channels: 4,
      background: args.background ?? "#ff000080",
    },
  })
    .toFormat(args.format)
    .toBuffer();
}

describe("renderAvatarImage", () => {
  it.each(["png", "jpeg", "webp", "gif"] as const)(
    "re-encodes a %s as a 256px PNG",
    async (format) => {
      const output = await renderAvatarImage(
        await image({ width: 40, height: 40, format }),
      );
      const metadata = await sharp(output).metadata();
      expect(metadata).toMatchObject({
        format: "png",
        width: 256,
        height: 256,
      });
    },
  );

  it("crops a non-square image to a square", async () => {
    const output = await renderAvatarImage(
      await image({ width: 800, height: 200, format: "png" }),
    );
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({ width: 256, height: 256 });
  });

  it("keeps transparency", async () => {
    const output = await renderAvatarImage(
      await image({ width: 10, height: 10, format: "png" }),
    );
    const { data } = await sharp(output).raw().toBuffer({
      resolveWithObject: true,
    });
    expect(data[3]).toBe(128);
  });

  it("flattens transparency onto a background", async () => {
    const output = await renderAvatarImage(
      await image({
        width: 10,
        height: 10,
        format: "png",
        background: "#00000000",
      }),
      { background: "#fff" },
    );
    const { data, info } = await sharp(output).raw().toBuffer({
      resolveWithObject: true,
    });
    expect(info.channels).toBe(3);
    expect([...data.subarray(0, 3)]).toEqual([255, 255, 255]);
  });

  it.each([
    ["an SVG", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ["text", Buffer.from("hello")],
    ["an empty file", Buffer.alloc(0)],
  ])("rejects %s", async (_label, input) => {
    await expect(renderAvatarImage(input)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("rejects an AVIF, which sharp reads but the form does not offer", async () => {
    await expect(
      renderAvatarImage(await image({ width: 8, height: 8, format: "avif" })),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects an image declaring more pixels than it may decode", async () => {
    const input = await sharp({
      create: { width: 5000, height: 5000, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();
    await expect(renderAvatarImage(input)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
