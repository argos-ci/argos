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
    });

    expect(result).toEqual({ score: 0, width: 1425, height: 1146 });
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

    expect(result).toEqual({ score: 0, width: 1400, height: 300 });
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

    expect(result).toEqual({ score: 0, width: 250, height: 300 });
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

    expect(result).toEqual({
      score: 0,
      width: 1000,
      height: 786,
    });
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

    expect(result).toEqual({
      score: 0.00182697201018,
      width: 250,
      height: 786,
    });
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

    expect(result).toEqual({ score: 0, width: 327, height: 665 });
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

    expect(result).toEqual({
      height: 665,
      score: 0,
      width: 327,
    });
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

    expect(result).toEqual({
      score: 0.0000729166666667,
      width: 1280,
      height: 600,
    });
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

    expect(result).toEqual({
      score: 0.846446632356,
      width: 1000,
      height: 4469,
    });
  });
});
