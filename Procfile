release: yarn api:db:migrate
web: TRACE_SERVICE_NAME=web node lib/server/workers/web.js
buildAndSynchronize: TRACE_SERVICE_NAME=buildAndSynchronize node lib/server/workers/buildAndSynchronize.js
screenshotDiff: TRACE_SERVICE_NAME=screenshotDiff node lib/server/workers/screenshotDiff.js
