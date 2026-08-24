# Contributing

If you're reading this, you're awesome!

Thank you for helping us make this project great and being a part of the argos community. Here are a few guidelines that will help you along the way.

## 📂 Opening an issue

Have you found a bug or thought of a great new feature? Here's how to share it:

1. **Check for duplicates**: Search [existing issues](https://github.com/argos-ci/argos/issues) and [pull requests](https://github.com/argos-ci/argos/pulls) to see if your idea or bug has already been reported or resolved.
2. **Create a detailed issue**:
   - Describe the problem or feature request clearly.
   - Include steps to reproduce the bug or context for your suggestion.

💡 **Pro Tip**: Each topic deserves its own issue. Avoid combining unrelated ideas into a single issue.

## 🛠️ Submitting a Pull Request (PR)

Argos is an open source project, so pull requests are always welcome! Here’s how to make sure your contribution gets the best chance of being merged.

### General guidelines

- **Discuss first**: For larger changes, open an issue to get feedback from maintainers before coding.
- **Keep it focused**: One feature or bug fix per PR, please.
- **Include tests**: Please attempt to add or update tests to confirm your changes work as expected.
- **Write clear PR descriptions**: Explain what your PR does and why.

### Steps to submit your PR

1. **Fork the repository** and clone it to your local machine:

   ```sh
   git clone --depth 1 git@github.com:<your-username>/argos.git
   cd argos
   ```

2. **Create a branch** for your changes:

   ```sh
   git checkout main
   git pull origin main
   git checkout -b my-feature-branch
   ```

3. **Make your changes** and ensure your code adheres to the linting rules:

   ```sh
   pnpm run lint
   ```

4. **Run the test suite** to verify everything works:

   ```sh
   pnpm run test
   ```

5. **Push your branch** to your fork and create a pull request:

   ```sh
   git push --set-upstream origin my-feature-branch
   ```

6. **Visit GitHub and open a PR!**

## ⚡ Getting started with development

Follow these steps to set up your development environment:

**1. Install dependencies**

This project uses [pnpm](https://pnpm.io/), be sure to install it using [corepack](https://nodejs.org/api/corepack.html) or another method.

```sh
pnpm install
```

**2. Configure environment variables**

Copy `.env.example` as `.env` file in the root of the project.

**3. Update your hosts file**

Add the following lines to your hosts file to work locally:

```
# Argos
127.0.0.1 app.argos-ci.dev
127.0.0.1 api.argos-ci.dev
```

**4. Install SSL certificates**

Install [mkcert](https://github.com/FiloSottile/mkcert) and generate certificates:

```
mkcert -install
mkcert "*.argos-ci.dev"
```

Two files with the extension ".pem" should be generated at the root of the project.

**5. Set up the database**

```sh
brew install postgresql@18
brew link postgresql@18 --force
docker-compose up -d
pnpm run setup
pnpm run --filter @argos/backend db:seed
```

**6. Start the development server**

```sh
pnpm run dev
```

## 🧰 Troubleshooting

If you encounter this error:

```txt
MODULE_NOT_FOUND: @argos-ci/mask-fingerprint
```

Run:

```sh
pnpm i --force
```

## 📂 Branch Structure

- All stable releases are tagged ([view tags](https://github.com/argos-ci/argos/tags)).
- The main branch represents the latest development version of the library.

## ⚙️ GraphQL Development

### Add resolver mapping

When you add a new type linked to a model, don't forget to edit `codegen.ts` to add mapper.

Example with Build:

```ts
const mappers = {
  Build: "@argos/backend/models#Build",
};
```

## 📊 Database Management

### Using Seed Data

You can populate the database with development data using:

```sh
pnpm run --filter @argos/backend db:truncate && pnpm run --filter @argos/backend db:seed
```

### Migration

#### Create a migration

```sh
pnpm run --filter @argos/backend db:migrate:make my_migration
```

#### Dump the database

```sh
pnpm run --filter @argos/backend db:dump
```

#### Apply the latest migration

```sh
pnpm run --filter @argos/backend db:migrate:latest
```

### Reset the Test database

```sh
NODE_ENV=test pnpm run --filter @argos/backend db:reset
```

### Running against production data (read-only)

To debug with real data shapes, the app can run locally against the production
database through the `argos_dev_ro` Postgres role — read-only except for the
two tables the login flow writes (`user_sessions`, `team_users.lastAuthMethod`).

For connecting by hand (TablePlus, `psql`) and for how production authenticates
at all, see [docs/database-access.md](docs/database-access.md).

```sh
pnpm run dev:prod-ro
```

The command wraps `pnpm run dev` in `op run --env-file=.env.prod-ro`: no
secret ever lands on disk or in shell history. It needs three things set up
once:

- a **1Password item** `argos-prod-ro` in the `argos-dev` vault with the fields
  referenced by `.env.prod-ro` (`DATABASE_URL` — no password, e.g.
  `postgresql://argos_dev_ro@<rds-host>:5432/<db>` — `SQIDS_ALPHABET`, and
  `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`, which are the dev GitHub OAuth
  app's, the same pair as in your `.env`);
- **IAM database authentication enabled on the RDS instance**, which is a
  separate switch from the `rds_iam` grant on the role. Both are required, and
  when either is missing RDS answers a perfectly valid token with
  `password authentication failed for user "argos_dev_ro"`:

  ```sh
  aws rds describe-db-instances --region us-east-1 \
    --db-instance-identifier argos-postgres \
    --query 'DBInstances[0].IAMDatabaseAuthenticationEnabled'
  ```

- **AWS credentials** for a principal allowed to `rds-db:connect` as
  `argos_dev_ro` (`arn:aws:rds-db:<region>:<account>:dbuser:<db-resource-id>/argos_dev_ro`).
  Any principal the SDK can find works — an `aws sso login` session or a
  configured IAM user. There is no database password at all: `PG_IAM_AUTH=true`
  signs a short-lived token per connection.

What the mode changes, enforced by the config (`ARGOS_TARGET=prod-ro`):

- your `.env` is **not** loaded, and write-capable third-party credentials
  (Resend, Stripe, GitHub/GitLab/Google/Slack apps…) must be absent — the
  database grants make Postgres read-only, these keep everything else
  side-effect free;
- the worker refuses to run, and migrations / `knex-scripts` throw;
- Redis and RabbitMQ must be local (sessions, rate limits and enqueued jobs
  stay on your machine);
- conversely, a `DATABASE_URL` pointing at AWS **without** `ARGOS_TARGET=prod-ro`
  refuses to boot, so the guardrails cannot be forgotten.

**Sign in with an email code** (of an email that exists in production). Resend
is absent, so the email is never sent — read the code from your local Redis:

```sh
docker compose exec redis redis-cli -n 1 GET "email_verification:<your-email>"
```

**Or sign in with GitHub**, which works here but is read-only: the callback
matches your GitHub profile against an account that already exists and opens a
session, and writes nothing else. A GitHub account attached to no Argos user
is refused rather than created, and attaching a provider to a signed-in account
is refused too — both are writes this mode does not have.

GitLab and Google still write on the way in, and production passkeys are bound
to the `argos-ci.com` RP id, so neither works here.

## ✅ Testing your changes

### Linting

Ensure your code follows the project’s coding standards:

```sh
pnpm run lint
```

### Set up the test database

```sh
NODE_ENV=test pnpm run --filter @argos/backend db:create
NODE_ENV=test pnpm run --filter @argos/backend db:load
```

### Unit and Integration Tests

```sh
pnpm run test
```

### Run a specific test file

```sh
pnpm test path/to/test/file.e2e.test.ts
```

### End-to-End (E2E) Tests

1. Install Playwright dependencies:

```sh
npx playwright install --with-deps
```

2. Run E2E tests:

```sh
pnpm run test:e2e

# or in debug mode with
# pnpm run test:e2e --debug
```

## 📜 Coding Style

Please follow the coding style of the current code base. Argos uses [oxlint](https://oxc.rs/docs/guide/usage/linter.html) to maintain a consistent coding style, configured in `.oxlintrc.json` at the repository root. If possible, install the [Oxc extension](https://oxc.rs/docs/guide/usage/linter/editors.html) for your editor to get realtime feedback. Linting can be run manually with `pnpm run lint`, and most issues fixed with `pnpm run lint:fix`.

Continuous Integration will run linting on your PR, so it’s best to ensure your code is clean before submitting.

## 🚀 Roadmap and contribution ideas

Want to contribute but don’t know where to start? Check out [Argos' Roadmap](https://github.com/orgs/argos-ci/projects/1) and [open issues](https://github.com/argos-ci/argos/issues) for ideas. Every contribution helps!

## 📄 License

By contributing to the argos-ci/argos GitHub repository, you agree to license your work under the MIT license.

---

We’re excited to see what you’ll build! If you have any questions, don’t hesitate to ask in your pull request or issue. Happy coding! 🎉
