import config from 'config'

export async function formatUrlFromBuild(build) {
  if (!build.repository) {
    build.repository = await build.$relatedQuery('repository')
  }

  const owner = await build.repository.getOwner()
  const pathname = `/${owner.login}/${build.repository.name}/builds/${build.id}`

  return `${config.get('server.url')}${pathname}`
}
