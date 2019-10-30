import config from 'config'

export async function formatUrlFromBuild(build) {
  let { repository } = build

  if (!repository) {
    repository = await build.$relatedQuery('repository')
  }

  const owner = await repository.$relatedOwner()

  // const owner = await repository.getOwner()
  const pathname = `/${owner.login}/${repository.name}/builds/${build.id}`

  return `${config.get('server.url')}${pathname}`
}
