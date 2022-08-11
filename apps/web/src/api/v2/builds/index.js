import express from "express";
import create from "./create";
import update from "./update";

const router = express.Router();
export default router;

// This is the description of how the build system work. We call the "client" the uploader,
// usually the CLI.The build API is separated in two phases:

// ## 1. Create — POST /builds

// The client sends the screenshots keys (sha256) and the commit.
// The server creates the build along signed S3 URLs to upload the screenshots.

// ## *Client requirement*
// Client must upload the screenshots using the signed URLs it got from the server before starting the phase 2.

// ## 2. Update / Finalize — PUT /builds/:buildId

// The client sends the `screenshots` (`key` and `name`).
// The server verifies that the screenshots are present and mark the build as complete.

// ## Parallel mode

// The parallel mode is used when the client wants to upload the screenshots in several times.
// To activate the pallaral mode, the client must send the `parallel` parameter with a value of `true`.
// It works with two fondamental parameters:
// - `parallelTotal`: the total number of upload batches (usually the number of parallel workers)
// - `parallelNonce`: the nonce of the current upload batch

router.use(create);
router.use(update);
