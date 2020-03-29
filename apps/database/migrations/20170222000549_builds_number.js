exports.up = async knex => {
  await knex.schema.table('builds', table => {
    table.integer('number').index()
  })
  await knex.raw(`
    UPDATE builds SET number = numbers.number
    FROM (
      SELECT id, row_number() OVER (PARTITION BY "repositoryId" ORDER BY id) AS number
      FROM builds
    ) AS numbers
    WHERE builds.id = numbers.id
  `)
  await knex.raw('ALTER TABLE builds ALTER COLUMN "number" SET NOT NULL')
}

exports.down = async knex => {
  await knex.schema.table('builds', table => {
    table.dropColumn('number')
  })
}
