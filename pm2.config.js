module.exports = {
  ignore_watch: ['node_modules', '**.test.js', '**/__fixtures__', '**/__snapshots__'],
  kill_timeout: 5000,
  apps: [
    {
      name: 'web',
      args: 'src/server/workers/web.js',
      watch: ['src/server', 'src/modules'],
      script: 'node_modules/.bin/babel-node',
    },
    {
      name: 'buildAndSynchronize',
      args: 'src/server/workers/buildAndSynchronize.js',
      watch: ['src/server', 'src/modules'],
      script: 'node_modules/.bin/babel-node',
    },
    {
      name: 'screenshotDiff',
      args: 'src/server/workers/screenshotDiff.js',
      watch: ['src/server', 'src/modules'],
      script: 'node_modules/.bin/babel-node',
    },
  ],
}
