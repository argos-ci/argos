/* eslint-disable @typescript-eslint/no-unused-vars */
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { LocalImageFile } from "@argos-ci/storage";

import { diffImages } from "./index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

describe("#diffImages", () => {
  it("simple", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/simple/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/simple/base.png"),
      }),
      fuzz: 900,
    });

    expect(result.score).toBeCloseTo(0.306, 2);
    expect(result.pixels).toBeCloseTo(50e4, -4);
  });

  it("simple with enough fuzz", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/simple/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/simple/base.png"),
      }),
      fuzz: 70 ** 2,
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("alphaBackground", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/alphaBackground/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/alphaBackground/base.png"),
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("boxShadow", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/boxShadow/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/boxShadow/base.png"),
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("border", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/border/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/border/base.png"),
      }),
    });

    expect(result.score).toBe(0);
  });

  it("fontAliasing", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/fontAliasing/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/fontAliasing/base.png"),
      }),
    });

    expect(result.score).toBeCloseTo(0, 2);
  });

  it("imageCompression", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression/base.png"),
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("imageCompression2", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression2/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression2/base.png"),
      }),
    });

    expect(result.score).toBe(0);
    expect(result.scoreRaw).toBeLessThan(1e-5);
  });

  it("imageCompression3", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression3/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/imageCompression3/base.png"),
      }),
    });

    expect(result.pixels).toBeCloseTo(35, -2);
    expect(result.score).toBeCloseTo(0, 3);
  });

  it("big images", async () => {
    const { filepath, ...result } = await diffImages({
      baseImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/big-images/compare.png"),
      }),
      compareImage: new LocalImageFile({
        filepath: join(__dirname, "__fixtures__/big-images/base.png"),
      }),
    });

    expect(result.score).toBeGreaterThan(0.95);
  });
});
