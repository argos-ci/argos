import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { S3Image, s3 as s3client } from "@argos-ci/storage";

import { diffImages } from "./index.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const s3 = s3client();

describe("#diffImages", () => {
  it("simple", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),

      fuzz: 900,
    });

    expect(result.score).toBeCloseTo(0.306, 2);
    expect(result.pixels).toBeCloseTo(50e4, -4);
  });

  it("simple with enough fuzz", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/simple/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
      fuzz: 70 ** 2,
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("alphaBackground", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/alphaBackground/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/alphaBackground/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/alphaBackground/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("boxShadow", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/boxShadow/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/boxShadow/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/boxShadow/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("border", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/border/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/border/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/border/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBe(0);
  });

  it("fontAliasing", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/fontAliasing/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/fontAliasing/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/fontAliasing/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBeCloseTo(0, 2);
  });

  it("imageCompression", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBe(0);
    expect(result).toMatchSnapshot();
  });

  it("imageCompression2", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression2/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression2/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(
          __dirname,
          "__fixtures__/imageCompression2/diff_tmp.png"
        ),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBe(0);
    expect(result.scoreRaw).toBeLessThan(1e-5);
  });

  it("imageCompression3", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression3/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/imageCompression3/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(
          __dirname,
          "__fixtures__/imageCompression3/diff_tmp.png"
        ),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.pixels).toBeCloseTo(35, -2);
    expect(result.score).toBeCloseTo(0, 3);
  });

  it("big images", async () => {
    const result = await diffImages({
      baseImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/big-images/compare.png"),
        localFile: true,
        protectOriginal: true,
      }),
      compareImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/big-images/base.png"),
        localFile: true,
        protectOriginal: true,
      }),
      diffImage: new S3Image({
        s3,
        filePath: join(__dirname, "__fixtures__/big-images/diff_tmp.png"),
        localFile: true,
        protectOriginal: true,
      }),
    });

    expect(result.score).toBeGreaterThan(0.95);
  });
});
