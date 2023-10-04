import { job as captureJob } from "@/capture/index.js";
import { Capture, Crawl } from "@/database/models/index.js";
import { createModelJob } from "@/job-core/index.js";

export const performCrawl = async (crawl: Crawl) => {
  const capture = await Capture.query().insertAndFetch({
    jobStatus: "pending",
    crawlId: crawl.id,
    url: crawl.baseUrl,
  });

  captureJob.push(capture.id);
};

export const job = createModelJob("crawl", Crawl, performCrawl);
