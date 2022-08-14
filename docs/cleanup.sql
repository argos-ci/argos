-- Remove all builds and dependencies older than 30 days

DELETE FROM build_notifications
WHERE id in(
		SELECT
			build_notifications.id FROM build_notifications
			JOIN builds ON build_notifications. "buildId" = builds.id
		WHERE
			builds. "createdAt" < now() - interval '30 day');

DELETE FROM screenshot_diffs
WHERE id in(
		SELECT
			screenshot_diffs.id FROM screenshot_diffs
			JOIN builds ON screenshot_diffs. "buildId" = builds.id
		WHERE
			builds. "createdAt" < now() - interval '30 day');

DELETE FROM builds
WHERE "createdAt" < now() - interval '30 day';

DELETE FROM screenshots
WHERE id in(
		SELECT
			screenshots.id FROM screenshots
			JOIN screenshot_buckets ON screenshots. "screenshotBucketId" = screenshot_buckets.id
		WHERE
			NOT EXISTS (
				SELECT
					1 FROM builds
				WHERE
					"baseScreenshotBucketId" = screenshot_buckets.id
					OR "compareScreenshotBucketId" = screenshot_buckets.id));

DELETE FROM screenshot_buckets
WHERE NOT EXISTS (
		SELECT
			1
		FROM
			builds
		WHERE
			"baseScreenshotBucketId" = screenshot_buckets.id
			OR "compareScreenshotBucketId" = screenshot_buckets.id);