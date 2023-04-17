import { job as captureJob } from "@argos-ci/capture";
import { Capture, Crawl } from "@argos-ci/database/models";
import { createModelJob } from "@argos-ci/job-core";

export const performCrawl = async (crawl: Crawl) => {
  const capture = await Capture.query().insertAndFetch({
    jobStatus: "pending",
    crawlId: crawl.id,
    url: crawl.baseUrl,
  });

  captureJob.push(capture.id);
};

export const job = createModelJob("crawl", Crawl, performCrawl);
