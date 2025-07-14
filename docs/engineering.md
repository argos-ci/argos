# Argos Engineering Documentation & Technical References

This document outlines Argos’ architecture, explains how it’s hosted on Heroku using AWS S3 for image storage, and describes where to find further engineering references. The Argos SDK are maintained in a separate repository at [argos-ci/argos-javascript](https://github.com/argos-ci/argos-javascript).

## Table of Contents

- [Overview](#overview)
- [Hosting & Storage](#hosting--storage)
- [Architecture Highlights](#architecture-highlights)
- [Development Workflow](#development-workflow)
- [Technical References](#technical-references)

---

## Overview

Argos is a visual testing platform that helps teams:

- Compare screenshots
- Detect UI regressions quickly
- Integrate seamlessly into various CI workflows

It achieves this by hosting its core application on Heroku, uploading screenshots to AWS S3, and providing some SDKs to facilitate automation from different CI services and testing frameworks.

---

## Hosting & Storage

- **Heroku**: The main Argos application (Node.js server, background jobs, and frontend) runs on Heroku.
- **AWS S3**: Stores all uploaded screenshots for diffing and long-term reference.

---

## Architecture Highlights

Argos follows a loosely coupled, service-oriented approach to streamline continuous visual testing.

1. **Node.js Backend (API & Background Jobs)**
   - **Core Server**: Serves GraphQL endpoints and handles user authentication, project/build logic, and screenshot-diff coordination.
   - **Job System**: Several background workers handle time-consuming tasks like image processing, diffs, and notification dispatch.
   - **Data Layer**: Uses PostgreSQL for persistence, with `knex` migrations to manage schema changes.

2. **React Frontend (SPA)**
   - **UI**: A React application presents dashboards for project/build statuses and screenshot comparisons.
   - **Integration**: Communicates with the backend via GraphQL to fetch diffs, results, and user data.
   - **Security & Auth**: Relies on tokens or session-based strategies (handled by the backend) for secure data exchanges.

3. **Notifications System**
   - **Notifications**: Integration with Git system for build statuses, regressions detection.

4. **Screenshot Management**
   - **AWS S3**: Stores versioned screenshots.
   - **Comparison Workflow**: The backend fetches these images when running diffs and updates build status accordingly.
   - **Diff Generation**: Dedicated modules (`screenshot-diff/`) handle image processing, typically in a queue-driven manner.

5. **CLI (Separate Repo)**
   - **CI Integration**: The CLI publishes screenshots from any CI environment.
   - **Authentication**: Users or CI systems provide an ARGOS_TOKEN to associate the screenshots with the correct Argos project.

6. **Configuration & Deployment**
   - **Heroku**: Heroku’s provisioning system manage staging/production deployments.
   - **Docker & Local**: `docker-compose.yml` can spin up local services (like PostgreSQL) for easier development/testing.

---

## Development Workflow

- **Install & Setup & Testing**
  Follow the instructions in the [CONTRIBUTING.md](../CONTRIBUTING.md) file to set up the development environment and run tests.

- **Deployment**
  - **Heroku**: Automatically triggers `pnpm run heroku-postbuild` (which in turn runs `build`) before deploying.
  - **Production Builds**: `pnpm run build` compiles and optimizes both backend and frontend assets.

---

## Technical References

Argos relies on a modern, TypeScript-heavy toolchain and documentation scattered across multiple files and folders:

1. **Core Configuration & Scripts**
   - **`package.json`**: Defines top-level scripts (e.g., `dev`, `build`, `test`), pinned Node version, and the main dev dependencies.
   - **`turbo.json`**: Coordinates concurrent build/test steps in a monorepo environment.
   - **`.env.example`**: Shows typical environment variables for local or Heroku setups.

2. **Backend Code**
   - Written in TypeScript.
   - Uses **knex** for database migrations and queries.
   - Interacts with AWS S3 for screenshot storage.
   - GraphQL-related modules leverage **graphql-codegen** for generating typed schema/resolvers.

3. **Frontend Code**
   - A React-based SPA that uses routes, components, and various hooks.
   - Configured to handle screenshot diff results and present build statuses.
   - Tailwind CSS for quick UI styling.

4. **Testing Infrastructure**
   - **Vitest** for unit and integration tests.
   - **Playwright** for end-to-end testing.

5. **SDKs**
   - Found in a separate repo: [argos-ci/argos-javascript](https://github.com/argos-ci/argos-javascript).
   - Publishes screenshots from CI environments.
   - Shares authentication tokens and project info with the Argos backend.

---

For any further questions or contributions, open an [issue](https://github.com/argos-ci/argos/issues) or submit a pull request. Happy building and testing!
