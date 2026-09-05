# How to Contribute

`sws2apps-api` is our backend service, and contributions are welcome. This guide
explains how to prepare a local environment and submit a change.

Please make sure that you have read the [code of conduct](https://github.com/sws2apps/sws2apps-api/blob/main/CODE_OF_CONDUCT.md) before continuing.

## Semantic Versioning

`sws2apps-api` follows semantic versioning. We release patch versions for bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes. Every significant change is documented in the [changelog](https://github.com/sws2apps/sws2apps-api/blob/main/CHANGELOG.md) file.

## Branch Organization

The `main` branch contains the current API. Create a focused branch from an
up-to-date `main` branch for each change. Use feature flags when incomplete behavior
must be merged without being enabled for every application.

## Bugs

### Known Issues and Report

We are using [GitHub Issues](https://github.com/sws2apps/sws2apps-api/issues) to keep track of bugs fix, and changes to be made to the application. We keep a close eye on this and try to make it clear when we have an internal fix in progress. Before filing a new task, try to make sure your problem doesn’t already exist.

### Security Bugs

Please do not report security bugs in the public issues; go through the process outlined on the [Security Policy](https://github.com/sws2apps/sws2apps-api/blob/main/SECURITY.md).

## Proposing a Change

If you intend to add new features or suggest major changes to this API, check first that your idea is not yet in our tracking issues list. If not, we recommend creating a new [discussion first](https://github.com/sws2apps/sws2apps-api/discussions/categories/ideas). This lets us reach an agreement on your proposal before you put significant effort into it. After it has been approved, please create [new issue](https://github.com/sws2apps/sws2apps-api/issues), and choose the correct template.

If you’re only fixing a bug, it’s fine to submit a pull request right away but we still recommend to file an issue detailing what you’re fixing. This is helpful in case we don’t accept that specific fix but want to keep track of the issue.

## Contribution Prerequisites

- Install Node.js 24, npm 11 or newer, and Git.
- Install Java 21 when running Firebase emulator integration tests.
- You will be working on one item at a time.
- If you do not have it yet, fork the repository. Clone it if you will work locally.
- If you have already forked and clone the repository, make sure that it is in sync with the upstream repository ([Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)).
- Run `npm install` to install the dependencies.

### Firebase emulator tests

The repository contains the emulator configuration used by the Firebase adapter
integration suite. Run:

```sh
npm run test:firebase
```

The command downloads the pinned Firebase CLI, starts isolated Authentication,
Firestore, and Storage emulators for `organized-local`, runs the integration tests,
and then stops the emulators. It does not require a Firebase login or a remote
Firebase project.

For interactive development with long-running emulators, install the Firebase CLI
and run `npm run start:emulators` in a separate terminal.

### Setup Environment Variables

Environment variables are required in order to locally run this API. You can just copy the `.env.example` file to `.env`.

### Starting the Development Server

- Open a new terminal and run `npm run dev` to start the development server, and interact with the API.

### Creating Your Congregation Account

When working with a new emulator data set, create a local user and congregation
account before testing authenticated workflows.

- When creating user account, the use of authenticator app is optional. When required, the OTP code is printed on the dev console. If you still want to use authenticator app, you have to delete and create a new account each time you run the dev server.

## Sending a Pull Request (PR)

We are monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation. We’ll do our best to provide updates and feedback throughout the process.

**Before submitting a PR**, please make sure the following is done:

- Run `npm run build`, `npm run lint`, and `npm test`.
- Run `npm run test:firebase` when changing a Firebase adapter or its integration
  behavior.
- Confirm that the public OpenAPI contract remains synchronized with route changes.

**When commiting your changes**, we recommend the following command to be run:

- Check again if your forked repository or your local copy is up to date with upstream. ([Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)).
- Resolve conflicts if any.
- Commit and push your changes to your forked repository.

**When your proposed changes are in the forked repository on GitHub**:

- Create your PR.
- Make sure the title follows the [conventional-changelog](https://github.com/semantic-release/semantic-release#commit-message-format) format, depending on what item or issue you have been working on. Failure to set this accordingly will cause your pull request to be discarded.

You will receive a notification and be informed when your PR is published on development, staging, or in production.
