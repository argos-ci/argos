import path from 'path';
import convict from 'convict';

const config = convict({
  env: {
    doc: 'The application environment',
    format: [
      'production',
      'development',
      'test',
      'browser.development',
    ],
    default: 'development',
    env: 'NODE_ENV',
  },
  googleAnalytics: {
    doc: 'The tracking id',
    default: 'UA-89989315-1',
  },
  server: {
    port: {
      doc: 'The server port number',
      format: 'port',
      default: 4001,
      env: 'PORT',
    },
  },
  client: {
    port: {
      doc: 'The client port number',
      format: 'port',
      default: 4002,
    },
  },
});

const env = config.get('env');
config.loadFile(path.join(__dirname, `../config/${env}.json`));
config.validate();

export default config;
