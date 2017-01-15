import Knex from 'knex';
import { Model } from 'objection';
import config from 'config';
import knexConfig from '../../../knexfile';

export default () => {
  const knex = Knex(knexConfig[config.get('env')]);
  Model.knex(knex);
};
