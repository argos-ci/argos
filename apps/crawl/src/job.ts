import axios from "axios";
import * as cheerio from "cheerio";

import { job as captureJob } from "@argos-ci/capture";
import { Capture, Crawl } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";

export const scrapLinks = async (url: string): Promise<string[]> => {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const anchors = $("a");
  const links: string[] = [];

  anchors.each((_, element) => {
    const link = $(element).attr("href");
    if (link) links.push(link);
  });

  return links;
};

export const formatAndFilterLinks = (
  baseUrlOrigin: string,
  urls: string[]
): URL[] => {
  const seen = new Set<string>();

  return urls.reduce((acc, url) => {
    try {
      const formattedUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      const absoluteUrl = formattedUrl.startsWith("/")
        ? new URL(formattedUrl, baseUrlOrigin)
        : new URL(formattedUrl);
      const absoluteUrlStr = absoluteUrl.toString();

      if (
        seen.has(absoluteUrlStr) ||
        !/^https?:$/i.test(absoluteUrl.protocol) ||
        absoluteUrl.origin !== baseUrlOrigin
      ) {
        return acc;
      }

      seen.add(absoluteUrlStr);
      return [...acc, absoluteUrl];
    } catch (_) {
      return acc;
    }
  }, [] as URL[]);
};

export const crawlUrls = async (url: string, limit = 30): Promise<string[]> => {
  const baseUrl = new URL(url);
  const links = await scrapLinks(baseUrl.toString());
  const queue = formatAndFilterLinks(baseUrl.origin, links);
  const res = new Set<string>(queue.map((url) => url.toString()));

  while (queue.length > 0 && res.size < limit) {
    const currentUrl = queue.shift()!;
    const pageLinks = await scrapLinks(currentUrl.toString());
    const pageUrls = formatAndFilterLinks(baseUrl.origin, pageLinks);
    const newUrls = pageUrls.filter((url) => !res.has(url.toString()));
    queue.push(...newUrls);
    newUrls.forEach((urlStr) => {
      res.add(urlStr.toString());
    });
  }
  return Array.from(res).slice(0, limit);
};

export const performCrawl = async (crawl: Crawl) => {
  const urls = await crawlUrls(crawl.baseUrl, 30);

  if (urls.length === 0) {
    return;
  }

  const captures = await Capture.query()
    .returning("id")
    .insert(
      urls.map((url) => ({
        jobStatus: "pending" as const,
        crawlId: crawl.id,
        url,
      }))
    );
  captures.forEach((capture) => {
    captureJob.push(capture.id);
  });
};

export const job = createModelJob("crawl", Crawl, performCrawl);
