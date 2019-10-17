const VALID_ASSET_REGEXP = /\.(mjs|js|css|html)$/i

export function getTotalAssetsSize(stats) {
  return stats.assets
    .filter(asset => VALID_ASSET_REGEXP.test(asset.name))
    .reduce((sum, asset) => sum + asset.size, 0)
}

export function getTotalAssetsNumber(stats) {
  return stats.assets.length
}
