# How to Contribute

SWS API is our backend service. But we are also more than happy to receive support from those who are very intersted to assist us. Hopefully this document makes the process for contributing clear and answers some questions that you may have.

Please make sure that you have read the [code of conduct](https://github.com/sws2apps/sws2apps-api/blob/main/CODE_OF_CONDUCT.md) before continuing.

## Semantic Versioning

SWS API follows semantic versioning. We release patch versions for bugfixes, minor versions for new features or non-essential changes, and major versions for any breaking changes. Every significant change is documented in the [changelog](https://github.com/sws2apps/sws2apps-api/blob/main/CHANGELOG.md) file.

## Branch Organization

We used three different branches to make production, beta and alpha releases of SWS API:

| branch | whats for                                                                         |
| :----- | :-------------------------------------------------------------------------------- |
| main   | production release: bug fix for the current version will be queued in this branch |
| beta   | beta release: new features will be queued in this branch                          |
| alpha  | alpha release: breaking changes will be queued in this branch                     |

## Bugs

### Known Issues and Report

We are using [GitHub Issues](https://github.com/sws2apps/sws2apps-api/issues) to keep track of bugs fix. We keep a close eye on this and try to make it clear when we have an internal fix in progress. Before filing a new task, try to make sure your problem doesn’t already exist.

### Security Bugs

Please do not report security bugs in the public issues; go through the process outlined on the [Security Policy](https://github.com/sws2apps/sws2apps-api/blob/main/SECURITY.md).

## Proposing a Change

If you intend to add new features or suggest major changes to SWS API, we recommend creating a [new discussion first](https://github.com/sws2apps/sws2apps-api/discussions/categories/ideas). This lets us reach an agreement on your proposal before you put significant effort into it. Make sure that the change you want to propose is not duplicate.

If you’re only fixing a bug, it’s fine to submit a pull request right away but we still recommend to file an issue detailing what you’re fixing. This is helpful in case we don’t accept that specific fix but want to keep track of the issue.

## Contribution Prerequisites

- You have the latest version of [Node](https://nodejs.org) and [Git](https://git-scm.com) installed
- Fork the repository (and clone it if you will work in your local environment).
- If you already have clonned the forked repository, make sure that your branch repository is [up to date](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork) with upstream.
- Start working in the appropriate branch, depending on what you are suggesting:
  - `main`, if you want to suggest a bug fix for the current version released in production.
  - `beta`, if you want to suggest a new feature.
  - `alpha`, if you want to suggest a breaking change.
- Setup the environment variable .env. To get the right values, contact one of the developers contributing to this project. Alternatively, you can create your own values while you are working.
  ```bash
  GOOGLE_CONFIG_BASE64=firebase-admin-key-encoded-base64-string
  FIREBASE_API_KEY=firebase-api-key
  SALT_ROUNDS=encryption-salt
  GMAIL_APP_PASSWORD=gmail-app-password
  GMAIL_ADDRESS=gmail-address
  GMAIL_SENDER_NAME=gmail-sender-name
  ```
- Run `npm i` in your local branch.

## Sending a Pull Request (PR)

We are monitoring for pull requests. We will review your pull request and either merge it, request changes to it, or close it with an explanation. We’ll do our best to provide updates and feedback throughout the process.

**Before submitting a PR**, please make sure the following is done:

1. Run `npm run dev` to make sure that the local development server is running correctly.
2. Test your changes to make sure that they are working as intended.

**When you are ready to commit your changes**, we recommend the following commands to be run:

1. Run `npm run ghcommit` to start the [commitizen cli](https://github.com/commitizen/cz-cli#using-the-command-line-tool). Make sure that you’ve set your changes accordingly. Failure to set this accordingly will cause your pull request on the release branch to be discarded.
2. Run `git push`

**When your proposed changes are in the forked repository on GitHub**:

1. Create your PR.
2. Make sure the title follows the [conventional-changelog](https://github.com/semantic-release/semantic-release#commit-message-format) format.

You will receive a notification when your PR is published on alpha, or beta, or in production.
