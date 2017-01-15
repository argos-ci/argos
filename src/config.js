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
    default: 'UA-89989315-2',
  },
  server: {
    port: {
      doc: 'The server port number',
      format: 'port',
      default: 4001,
      env: 'PORT',
    },
    logFormat: {
      doc: 'The morgan log format to use',
      format: String,
      default: 'dev',
    },
  },
  client: {
    port: {
      doc: 'The client port number',
      format: 'port',
      default: 4002,
    },
  },
  amqp: {
    url: {
      doc: 'RabbitMQ url',
      format: String,
      default: 'amqp://localhost',
      env: 'CLOUDAMQP_URL',
    },
  },
  s3: {
    screenshotsBucket: {
      doc: 'Bucket containing screenshots',
      format: String,
      default: 'argos-screenshots-dev',
    },
  },
});

const env = config.get('env');
config.loadFile(path.join(__dirname, `../config/${env}.json`));
config.validate();

export default config;
