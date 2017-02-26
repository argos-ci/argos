import config from 'config'

export async function formatUrlFromBuild(build, { absolute = false } = {}) {
  if (!build.repository) {
    [build.repository] = await build.$relatedQuery('repository')
  }

  const owner = await build.repository.getOwner()

  const pathname = `/${owner.getUrlIdentifier()}/${build.repository.name}/builds/${build.id}`

  if (absolute) {
    return `${config.get('server.url')}${pathname}`
  }

  return pathname
}
