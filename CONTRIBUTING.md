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
docker-compose up -d
pnpm run setup
pnpm run --filter @argos/backend db:seed
```

**6. Start the development server**

```sh
pnpm run dev
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
NODE_ENV=test pnpm run --filter @argos/backend db:seed
```

### Unit and Integration Tests

```sh
pnpm run test
```

### End-to-End (E2E) Tests

1. Install Playwright dependencies:

```sh
npx playwright install --with-deps
```

2. Run E2E setup:

```sh
pnpm run e2e:setup
```

3. Run E2E tests:

```sh
pnpm run e2e:start

# or in debug mode with
# pnpm run e2e:start -- --debug
```

## 📜 Coding Style

Please follow the coding style of the current code base. Argos uses ESLint to maintain a consistent coding style. If possible, enable linting in your editor to get realtime feedback. Linting can be run manually with `pnpm run lint`.

Continuous Integration will run linting on your PR, so it’s best to ensure your code is clean before submitting.

## 🚀 Roadmap and contribution ideas

Want to contribute but don’t know where to start? Check out [Argos' Roadmap](https://github.com/orgs/argos-ci/projects/1) and [open issues](https://github.com/argos-ci/argos/issues) for ideas. Every contribution helps!

## 📄 License

By contributing to the argos-ci/argos GitHub repository, you agree to license your work under the MIT license.

---

We’re excited to see what you’ll build! If you have any questions, don’t hesitate to ask in your pull request or issue. Happy coding! 🎉
