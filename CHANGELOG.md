## [2.4.1](https://github.com/sws2apps/sws2apps-api/compare/v2.4.0...v2.4.1) (2022-01-30)


### Bug Fixes

* **heroku-logger:** fix log formatting ([04122dc](https://github.com/sws2apps/sws2apps-api/commit/04122dc309126180d8790993e233c3d76a918bc0))

# [2.4.0](https://github.com/sws2apps/sws2apps-api/compare/v2.3.0...v2.4.0) (2022-01-30)


### Features

* **heroku-logger:** change winston from heroku-logger ([c854ce1](https://github.com/sws2apps/sws2apps-api/commit/c854ce10ce43ba40d5a3b794e389ae62dfb420af))

# [2.3.0](https://github.com/sws2apps/sws2apps-api/compare/v2.2.2...v2.3.0) (2022-01-30)


### Bug Fixes

* **logger:** change all instances of logger to use winston library ([f447ee7](https://github.com/sws2apps/sws2apps-api/commit/f447ee72d1b14382448eedb2d1339b462083019b))


### Features

* **winston:** add winston as logger dependency ([514848f](https://github.com/sws2apps/sws2apps-api/commit/514848fad82d1e6cb4ece75da6bcdc2e4c5b11de))

## [2.2.2](https://github.com/sws2apps/sws2apps-api/compare/v2.2.1...v2.2.2) (2022-01-30)

### Bug Fixes

- **logger:** change severity warn to warn ([95dec1b](https://github.com/sws2apps/sws2apps-api/commit/95dec1bcd758b8ac2ddc5ba282708e352543793a))

## [2.2.1](https://github.com/sws2apps/sws2apps-api/compare/v2.2.0...v2.2.1) (2022-01-30)

### Bug Fixes

- **logger:** fix log formatting to follow heroku pattern ([c533509](https://github.com/sws2apps/sws2apps-api/commit/c533509865a566f02f36912d97083366ffaf15a8))

# [2.2.0](https://github.com/sws2apps/sws2apps-api/compare/v2.1.2...v2.2.0) (2022-01-30)

### Features

- **middleware, utils:** update logger formatting output ([be66502](https://github.com/sws2apps/sws2apps-api/commit/be665024379b860b9c3ebd0e9a5c87d71e1a3411))

## [2.1.2](https://github.com/sws2apps/sws2apps-api/compare/v2.1.1...v2.1.2) (2022-01-29)

### Bug Fixes

- **middleware:** remove unused import in sws-pocket-auth-checker middleware ([3e48e19](https://github.com/sws2apps/sws2apps-api/commit/3e48e19a6610d80694c11520870a18b68e5cd880))

## [2.1.1](https://github.com/sws2apps/sws2apps-api/compare/v2.1.0...v2.1.1) (2022-01-29)

### Bug Fixes

- **app:** fix error on server startup ([0d13edf](https://github.com/sws2apps/sws2apps-api/commit/0d13edf3c3e6736865570832f8f202efd4b8d9ad))

# [2.1.0](https://github.com/sws2apps/sws2apps-api/compare/v2.0.1...v2.1.0) (2022-01-29)

### Bug Fixes

- **congregation:** enhance congregation id generator ([a27c185](https://github.com/sws2apps/sws2apps-api/commit/a27c185f0e8621fd726f656f90170d8f48cb551d)), closes [#33](https://github.com/sws2apps/sws2apps-api/issues/33)

### Features

- **app:** change app from CommonJS to ES module ([b5c8527](https://github.com/sws2apps/sws2apps-api/commit/b5c85278ae42a8b46383cef71998a2f2728908e2))
- **dependency:** update some dependencies to their latest version ([2f3b323](https://github.com/sws2apps/sws2apps-api/commit/2f3b323cc6c5531ff3fad4e88489b3e3a1922a54))

## [2.0.1](https://github.com/sws2apps/sws2apps-api/compare/v2.0.0...v2.0.1) (2022-01-29)

### Bug Fixes

- **congregation:** enhance congregation id generator ([b3d8336](https://github.com/sws2apps/sws2apps-api/commit/b3d83360696af9681bad17691854f672c539a3a2)), closes [#33](https://github.com/sws2apps/sws2apps-api/issues/33)

# [2.0.0](https://github.com/sws2apps/sws2apps-api/compare/v1.0.3...v2.0.0) (2022-01-29)

### Bug Fixes

- **app:** fix exception on startup

### BREAKING CHANGES

- **app:** This change introduces a new way of scoping routes.

## [1.0.3](https://github.com/sws2apps/sws2apps-api/compare/v1.0.2...v1.0.3) (2022-01-26)

### Bug Fixes

- **semantic-release:** bump version to 19.0.2 ([f1663dd](https://github.com/sws2apps/sws2apps-api/commit/f1663ddaf535a485f38bd90507007d59ac20b82a))

## [1.0.2](https://github.com/sws2apps/sws2apps-api/compare/v1.0.1...v1.0.2) (2022-01-26)

### Bug Fixes

- **node-fetch:** bump version to 2.6.7 ([7d499e0](https://github.com/sws2apps/sws2apps-api/commit/7d499e075b4688d7ff496c083bd92eba96297d63))

## [1.0.2](https://github.com/sws2apps/sws2apps-api/compare/v1.0.1...v1.0.2) (2022-01-26)

### Bug Fixes

- **node-fetch:** bump version to 2.6.7 ([483dc6b](https://github.com/sws2apps/sws2apps-api/commit/483dc6b4f075cb6a909e5cb79c57e6e5365c1a07))

## [1.0.1](https://github.com/sws2apps/sws2apps-api/compare/v1.0.0...v1.0.1) (2021-12-26)

### Bug Fixes

- **utils:** disable utils during development ([f1bbf43](https://github.com/sws2apps/sws2apps-api/commit/f1bbf43dcabfcc1c5cc463987f06478182f7a983))

# 1.0.0 (2021-12-26)

### Features

- **app:** initial release ([9be7006](https://github.com/sws2apps/sws2apps-api/commit/9be7006d4740f2765eb103c1799f0693d6b5c077))
