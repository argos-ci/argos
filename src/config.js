import path from 'path';
import convict from 'convict';

const config = convict({
  env: {
    doc: 'The application environment',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV',
  },
  server: {
    port: {
      doc: 'The server port number',
      format: 'port',
      default: 3000,
      env: 'PORT',
    },
  },
});

const env = config.get('env');
config.loadFile(path.join(__dirname, `../config/${env}.json`));
config.validate();

export default config;
