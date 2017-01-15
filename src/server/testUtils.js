import { connect, disconnect } from 'server/database';

export const useDatabase = () => {
  let knex;

  beforeEach(async function () {
    knex = connect('test');
    await knex.migrate.latest();
  });

  afterEach(async function () {
    await disconnect(knex);
  });
};
