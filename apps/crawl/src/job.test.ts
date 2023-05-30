import { crawlUrls, formatAndFilterLinks } from "./job.js";

describe("#formatAndFilterLinks", () => {
  const baseUrl = new URL("https://argos-ci.com/docs");

  it("should conserve same baseUrl.origin URL", async () => {
    const url = "https://argos-ci.com/docs";
    const res = formatAndFilterLinks(baseUrl.origin, [url]);
    expect(res).toHaveLength(1);
    expect(res.map((e) => e.toString())).toEqual([url]);
  });

  it("should conserve relative url", async () => {
    const urls = ["/pricing", "/docs/introduction"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(2);
    expect(res.map((e) => e.toString())).toEqual([
      "https://argos-ci.com/pricing",
      "https://argos-ci.com/docs/introduction",
    ]);
  });

  it("should dedup same url", async () => {
    const urls = ["https://argos-ci.com/docs", "/docs/", "/docs"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(1);
    expect(res.map((e) => e.toString())).toEqual(["https://argos-ci.com/docs"]);
  });

  it("should empty url", async () => {
    const urls = [""];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(0);
  });

  it("should remove root url", async () => {
    const urls = ["/"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(0);
  });

  it("should remove other protocol", async () => {
    const urls = ["mailto:contact@argos-ci.com"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(0);
  });

  it("should remove empty protocol", async () => {
    const urls = ["www.google.com"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(0);
  });

  it("should other remove url from other domain", async () => {
    const urls = ["https://github.com/"];
    const res = formatAndFilterLinks(baseUrl.origin, urls);
    expect(res).toHaveLength(0);
  });
});

describe("#crawlUrls", () => {
  it("should return 30 urls", async () => {
    const urls = await crawlUrls("https://argos-ci.com");
    expect(urls).toHaveLength(30);
  });
});
