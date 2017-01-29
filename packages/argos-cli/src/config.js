import convict from 'convict'

const config = convict({
  endpoint: {
    doc: 'Argos API endpoint',
    format: 'url',
    default: 'https://api.argos-ci.com',
    env: 'ARGOS_API_ENDPOINT',
  },
  commit: {
    doc: 'Git commit',
    format: String,
    default: '',
    env: 'ARGOS_COMMIT',
  },
  branch: {
    doc: 'Git branch',
    format: String,
    default: '',
    env: 'ARGOS_BRANCH',
  },
})

config.validate()

export default config
