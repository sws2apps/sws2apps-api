# How to Contribute

`sws2apps-api` is our backend service. But we are also more than happy to receive support from those who are very intersted to assist us. Hopefully this document makes the process for contributing clear and answers some questions that you may have.

Please make sure that you have read the [code of conduct](https://github.com/sws2apps/sws2apps-api/blob/main/CODE_OF_CONDUCT.md) before continuing.

## Semantic Versioning

`sws2apps-api` follows semantic versioning. We release patch versions for bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes. Every significant change is documented in the [changelog](https://github.com/sws2apps/sws2apps-api/blob/main/CHANGELOG.md) file.

## Branch Organization

We use the `main` branch for the current version (CPE), but for the new Organized version it's important to use `main-e2e` branch. Feature flags are used for new features and major changes.

## Bugs

### Known Issues and Report

We are using [GitHub Issues](https://github.com/sws2apps/sws2apps-api/issues) to keep track of bugs fix, and changes to be made to the application. We keep a close eye on this and try to make it clear when we have an internal fix in progress. Before filing a new task, try to make sure your problem doesn’t already exist.

### Security Bugs

Please do not report security bugs in the public issues; go through the process outlined on the [Security Policy](https://github.com/sws2apps/sws2apps-api/blob/main/SECURITY.md).

## Proposing a Change

If you intend to add new features or suggest major changes to this API, check first that your idea is not yet in our tracking issues list. If not, we recommend creating a new [discussion first](https://github.com/sws2apps/sws2apps-api/discussions/categories/ideas). This lets us reach an agreement on your proposal before you put significant effort into it. After it has been approved, please create [new issue](https://github.com/sws2apps/sws2apps-api/issues), and choose the correct template.

If you’re only fixing a bug, it’s fine to submit a pull request right away but we still recommend to file an issue detailing what you’re fixing. This is helpful in case we don’t accept that specific fix but want to keep track of the issue.

## Contribution Prerequisites

- You have the latest version of [Node](https://nodejs.org), [Git](https://git-scm.com), [OpenJDK](https://www.oracle.com/java/technologies/downloads/) _(to be used for Firebase emulators)_ and [Firebase CLI](https://firebase.google.com/docs/cli) installed
- You have a dedicated project on Firebase for your local testing.
- You will be working on one item at a time.
- If you do not have it yet, fork the repository. Clone it if you will work locally.
- If you have already forked and clone the repository, make sure that it is in sync with the upstream repository ([Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)).
- Run `npm i` to install the needed dependencies

### Setup Firebase Emulators

We use Firebase to be our backend. Therefore, during development, Firebase Emulators is used.

- Run `cp storage.rules.example storage.rules` to copy `storage.rules.example` to `storage.rules`.
- Run `npm run start:emulators` to start the Firebase Emulators.

### Setup Environment Variables

Environment variables are required in order to locally run this API. You can just copy the `.env.example` file to `.env`.

### Starting the Development Server

- Open a new terminal and run `npm run dev` to start the development server, and interact with the API.

### Creating Your Congregation Account

As each development server will start with a new and clean Firebase Emulator instance, you have to create your user and congregation account.

- When creating user account, the use of authenticator app is optional. When required, the OTP code is printed on the dev console. If you still want to use authenticator app, you have to delete and create a new account each time you run the dev server.

## Sending a Pull Request (PR)

We are monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation. We’ll do our best to provide updates and feedback throughout the process.

**Before submitting a PR**, please make sure the following is done:

- Test your changes to make sure that they are working as intended.

**When commiting your changes**, we recommend the following command to be run:

- Check again if your forked repository or your local copy is up to date with upstream. ([Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)).
- Resolve conflicts if any.
- Commit and push your changes to your forked repository.

**When your proposed changes are in the forked repository on GitHub**:

- Create your PR.
- Make sure the title follows the [conventional-changelog](https://github.com/semantic-release/semantic-release#commit-message-format) format, depending on what item or issue you have been working on. Failure to set this accordingly will cause your pull request to be discarded.

You will receive a notification and be informed when your PR is published on development, staging, or in production.
