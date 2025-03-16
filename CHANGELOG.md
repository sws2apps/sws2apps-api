# [3.16.0](https://github.com/sws2apps/sws2apps-api/compare/v3.15.0...v3.16.0) (2025-03-16)


### Features

* **api:** add field service groups to all roles ([82a557a](https://github.com/sws2apps/sws2apps-api/commit/82a557a8b8dde6b43b4ceee1eecd5247ff94b927))

# [3.15.0](https://github.com/sws2apps/sws2apps-api/compare/v3.14.0...v3.15.0) (2025-03-16)


### Features

* **controllers:** support new access request workflow ([b0f43ab](https://github.com/sws2apps/sws2apps-api/commit/b0f43ab1f4a285bb040acfcd1ea2545e7e428d58))
* **deps:** bump firebase-admin from 13.1.0 to 13.2.0 ([12c4a2d](https://github.com/sws2apps/sws2apps-api/commit/12c4a2d3f3367ed479e843668ceb5b0fd8962c5f))
* **deps:** bump i18next from 24.2.2 to 24.2.3 ([71fe86e](https://github.com/sws2apps/sws2apps-api/commit/71fe86e9ce0e968df18821d2b4f1a9ec16358a12))

# [3.14.0](https://github.com/sws2apps/sws2apps-api/compare/v3.13.0...v3.14.0) (2025-02-21)


### Bug Fixes

* **api:** update class members ([f52783d](https://github.com/sws2apps/sws2apps-api/commit/f52783da7e179cbd7a10192975c174c9adde9c75))
* **controller:** always save data sync state ([71fbe4e](https://github.com/sws2apps/sws2apps-api/commit/71fbe4ec28ef92786b426c1ee068a089c70c21b6))
* **controller:** clean up metadata for disabled data sync ([9b83644](https://github.com/sws2apps/sws2apps-api/commit/9b836446ff243b0963d4a380467ad628d9c5c847))
* **controller:** update error message ([00bc006](https://github.com/sws2apps/sws2apps-api/commit/00bc006a4317a19a7e4435ee229900b1f46f4c74))


### Features

* **deps:** bump @crowdin/crowdin-api-client from 1.41.1 to 1.41.2 ([ce0a710](https://github.com/sws2apps/sws2apps-api/commit/ce0a7106492ea4f3b81fac1fc580238e411ec538))
* **deps:** bump compression from 1.7.5 to 1.8.0 ([70bef08](https://github.com/sws2apps/sws2apps-api/commit/70bef08cbfda82de11372ebbe4bf3e2a336959cc))
* **routes:** add new route for admins ([c38ead1](https://github.com/sws2apps/sws2apps-api/commit/c38ead1775e77604195b46a327fc810166a232ad))

# [3.13.0](https://github.com/sws2apps/sws2apps-api/compare/v3.12.1...v3.13.0) (2025-02-08)


### Features

* **api:** include languages count in stats ([83c51d5](https://github.com/sws2apps/sws2apps-api/commit/83c51d5b1942543312d3ca285401bc2bb2ba260d))
* **deps:** bump firebase-admin from 13.0.2 to 13.1.0 ([b55a4d2](https://github.com/sws2apps/sws2apps-api/commit/b55a4d270150cd4fcd28d4452a59b70070915e7a))

## [3.12.1](https://github.com/sws2apps/sws2apps-api/compare/v3.12.0...v3.12.1) (2025-02-06)


### Bug Fixes

* **classes:** convert cong number to strings for search ([19dc5b7](https://github.com/sws2apps/sws2apps-api/commit/19dc5b7b39ec4604c332af3f4ba41abb2b6ba938))
* **controllers:** update some log levels in congregation admin ([bea2548](https://github.com/sws2apps/sws2apps-api/commit/bea2548f838a545e54d6ce64052644ae6e44b54b))

# [3.12.0](https://github.com/sws2apps/sws2apps-api/compare/v3.11.1...v3.12.0) (2025-02-05)


### Bug Fixes

* **controllers:** link speakers details with data sync value ([beab637](https://github.com/sws2apps/sws2apps-api/commit/beab6374cb596732bc44caae58699245beed64cc))


### Features

* **views:** email template for approved join requests ([254808f](https://github.com/sws2apps/sws2apps-api/commit/254808f1571ee185dcd67249fb424d18be65dc8b))

## [3.11.1](https://github.com/sws2apps/sws2apps-api/compare/v3.11.0...v3.11.1) (2025-02-04)


### Bug Fixes

* **services:** assign default congregation created date ([4278411](https://github.com/sws2apps/sws2apps-api/commit/4278411947883382403a74677c5bf15e5d79b22f))

# [3.11.0](https://github.com/sws2apps/sws2apps-api/compare/v3.10.0...v3.11.0) (2025-02-03)


### Bug Fixes

* **controllers:** update app installation save action ([c65635c](https://github.com/sws2apps/sws2apps-api/commit/c65635c02403d5eff6fcb750d2eb3c079506b6e1))
* **services:** update createdAt property for admin ([6283f68](https://github.com/sws2apps/sws2apps-api/commit/6283f6870612f52a3b0b406bf2276006a81b7f3a))


### Features

* **api:** add feature flags management ([1c064c0](https://github.com/sws2apps/sws2apps-api/commit/1c064c0b17bda3d5fe6692220c45871310604210))
* **api:** cleanup old installations id ([cfdb552](https://github.com/sws2apps/sws2apps-api/commit/cfdb552fdefbcb41f17b061abef63761e1ba3688))
* **congregations:** add createdAt property ([dff36ef](https://github.com/sws2apps/sws2apps-api/commit/dff36ef6618bd8a06d08d5239e472bab218a1033))
* **congregations:** support new registration flow ([3cd08d2](https://github.com/sws2apps/sws2apps-api/commit/3cd08d2bb5d4220a0641b9a1a4171b9b68cb7732))

# [3.10.0](https://github.com/sws2apps/sws2apps-api/compare/v3.9.0...v3.10.0) (2025-01-31)


### Features

* **routes:** add public routes to get stats ([dc1d4f5](https://github.com/sws2apps/sws2apps-api/commit/dc1d4f5b35b38b41c93c105f30b38bf5ab082be4))

# [3.9.0](https://github.com/sws2apps/sws2apps-api/compare/v3.8.0...v3.9.0) (2025-01-30)


### Bug Fixes

* **controllers:** fix invalid property ([caffd05](https://github.com/sws2apps/sws2apps-api/commit/caffd05ac3e7e7a8df14300f0c234ec204c452e2))
* **controllers:** update congregation users response ([22b612d](https://github.com/sws2apps/sws2apps-api/commit/22b612d4fa49b63dcb79b91d0acc73642fa055b6))
* **controllers:** update role check for mismatch ([c271111](https://github.com/sws2apps/sws2apps-api/commit/c27111174b3b81f4360c3ba6af1503ce8bdb0d1e))
* **middleware:** update current session details ([c68b3b4](https://github.com/sws2apps/sws2apps-api/commit/c68b3b4609b87651442f344da3a8ca8d93a6b457))
* **services:** update users list for admin ([0cec91c](https://github.com/sws2apps/sws2apps-api/commit/0cec91c75743c36e89c4efa614cbe64b3a931461))
* **services:** update users response for admin ([2128357](https://github.com/sws2apps/sws2apps-api/commit/2128357ddbd12df15efab1492403dbcee6bde24b))
* **services:** update users response for admin ([2f1d03e](https://github.com/sws2apps/sws2apps-api/commit/2f1d03e1fdd260e47a21d1ca7cda81f15e461ea3))


### Features

* **controllers:** update user roles from admin console ([705ad42](https://github.com/sws2apps/sws2apps-api/commit/705ad424f049dc5e4b4c1788dd52865838aa9280))
* **deps:** bump @crowdin/crowdin-api-client from 1.41.0 to 1.41.1 ([496c654](https://github.com/sws2apps/sws2apps-api/commit/496c6545ebdfa77cc99aa92130fc547a53ed11e9))
* **deps:** bump i18next from 24.2.1 to 24.2.2 ([73939f1](https://github.com/sws2apps/sws2apps-api/commit/73939f113d15097d2b5e772f8f018ed8af815751))
* **routes:** add new admin routes ([4828f08](https://github.com/sws2apps/sws2apps-api/commit/4828f087eb2fcc057db3def355318c7b45131e5a))
* **routes:** add new admin routes ([f4a805d](https://github.com/sws2apps/sws2apps-api/commit/f4a805dcf1a28e291793aa4ec40fc0272af06949))

# [3.8.0](https://github.com/sws2apps/sws2apps-api/compare/v3.7.1...v3.8.0) (2025-01-26)


### Features

* **routes:** adding users without data sync enabled ([da7337e](https://github.com/sws2apps/sws2apps-api/commit/da7337e3278b2f6705de1a560d78fb1d4c16af7b))

## [3.7.1](https://github.com/sws2apps/sws2apps-api/compare/v3.7.0...v3.7.1) (2025-01-25)


### Bug Fixes

* **controllers:** check for undefined values when checking time aways ([5f2e93c](https://github.com/sws2apps/sws2apps-api/commit/5f2e93c258ed5a9b60a0bce0194e03acb8466fec))

# [3.7.0](https://github.com/sws2apps/sws2apps-api/compare/v3.6.0...v3.7.0) (2025-01-25)


### Features

* **deps:** bump nodemailer from 6.9.16 to 6.10.0 ([638a556](https://github.com/sws2apps/sws2apps-api/commit/638a5567abd225782c22c1579f73030908abe51d))
* **users:** support delegated field service reports ([7786cac](https://github.com/sws2apps/sws2apps-api/commit/7786cac05f84714271b91d074b0771b2da9aabc5))

# [3.6.0](https://github.com/sws2apps/sws2apps-api/compare/v3.5.0...v3.6.0) (2025-01-15)


### Bug Fixes

* **api:** make names optional when updating user ([f2d5e3a](https://github.com/sws2apps/sws2apps-api/commit/f2d5e3a8b9b08d776a768a2395502fcb405cc7a9))


### Features

* **api:** use metadata properties ([c063b0a](https://github.com/sws2apps/sws2apps-api/commit/c063b0a5999a5f0c226aba26408458de1de2e125))
* **deps:** bump express-validator from 7.2.0 to 7.2.1 ([0c24a2a](https://github.com/sws2apps/sws2apps-api/commit/0c24a2adbcb813346ab9482aec99c4a6f6e9d99e))
* **deps:** bump i18next from 24.2.0 to 24.2.1 ([5ee6811](https://github.com/sws2apps/sws2apps-api/commit/5ee6811cf3f5ab566b2f7daab2e22a7be487fe4a))
* **deps:** bump jsdom and global-jsdom ([42da12a](https://github.com/sws2apps/sws2apps-api/commit/42da12a7d9e17ed507368c9f80638509ec224d73))
* **deps:** bump randomstring from 1.3.0 to 1.3.1 ([65a00b3](https://github.com/sws2apps/sws2apps-api/commit/65a00b36e0942f73b2dfae64ee392d725577680e))
* **middleware:** include userId and congregationId in log ([dfcd8e4](https://github.com/sws2apps/sws2apps-api/commit/dfcd8e4042131cbf0481f94b82ade2a105a8fcab))

# [3.5.0](https://github.com/sws2apps/sws2apps-api/compare/v3.4.0...v3.5.0) (2024-12-27)


### Features

* **api:** use new env FIREBASE_STORAGE_BUCKET ([c51bc20](https://github.com/sws2apps/sws2apps-api/commit/c51bc20f947ff3386f4b502805c769b508cd55f3))
* **deps:** bump @crowdin/crowdin-api-client from 1.40.0 to 1.41.0 ([07a1811](https://github.com/sws2apps/sws2apps-api/commit/07a18115d9b28b10ca78fb7f002a9b6442a81b88))
* **deps:** bump express-rate-limit from 7.4.1 to 7.5.0 ([843cdc5](https://github.com/sws2apps/sws2apps-api/commit/843cdc5fd274efb0c7bd6ffade4ef02c73d1fd71))
* **deps:** bump firebase-admin from 13.0.1 to 13.0.2 ([d7032e4](https://github.com/sws2apps/sws2apps-api/commit/d7032e44763a72e2b4f4c2fbeabc9b94dd8ffecb))
* **deps:** bump i18next from 24.0.5 to 24.1.0 ([9878aff](https://github.com/sws2apps/sws2apps-api/commit/9878aff46317ce8f87183fbd36fec7c4f4b18bdd))
* **deps:** bump i18next from 24.1.0 to 24.1.2 ([30b7514](https://github.com/sws2apps/sws2apps-api/commit/30b7514a831df2ecf239b6c45730e3bc0326d4f3))
* **deps:** bump i18next from 24.1.2 to 24.2.0 ([64b19bd](https://github.com/sws2apps/sws2apps-api/commit/64b19bdde232ddf77fefc39c42073d8f9b75ea3f))
* **deps:** bump i18next-http-middleware from 3.7.0 to 3.7.1 ([bed6074](https://github.com/sws2apps/sws2apps-api/commit/bed6074f2de331eb2f5bc9aa0736642d5640eeb2))
* **deps:** bump node-html-parser from 6.1.13 to 7.0.1 ([43bcef3](https://github.com/sws2apps/sws2apps-api/commit/43bcef3aeb9378432465608e1a89970131ea061d))
* **deps:** bump otpauth from 9.3.5 to 9.3.6 ([8d4e1e2](https://github.com/sws2apps/sws2apps-api/commit/8d4e1e27fa4371372c305bd34346e28ab21c2a89))
* **deps:** bump sanitize-html from 2.13.1 to 2.14.0 ([32871f3](https://github.com/sws2apps/sws2apps-api/commit/32871f3d3bf49a3ad1798d9692ade92d53e36f67))

# [3.4.0](https://github.com/sws2apps/sws2apps-api/compare/v3.3.2...v3.4.0) (2024-12-11)


### Features

* **deps:** bump @crowdin/crowdin-api-client from 1.39.1 to 1.40.0 ([100f61d](https://github.com/sws2apps/sws2apps-api/commit/100f61d6677520da8d95f76295f0f8260fe98967))
* **users:** add createdAt property ([3225847](https://github.com/sws2apps/sws2apps-api/commit/32258475dbdb8a2b835c8a695d8b28979d18e6b1))

## [3.3.2](https://github.com/sws2apps/sws2apps-api/compare/v3.3.1...v3.3.2) (2024-12-08)


### Bug Fixes

* **routes:** update route typo for report submission ([b4baa24](https://github.com/sws2apps/sws2apps-api/commit/b4baa242c8c1a2f5d990c06e1162ae3c5a786bc8))

## [3.3.1](https://github.com/sws2apps/sws2apps-api/compare/v3.3.0...v3.3.1) (2024-12-07)


### Bug Fixes

* **controllers:** get schedules and sources for elder roles ([0d9e7b7](https://github.com/sws2apps/sws2apps-api/commit/0d9e7b7f6eee8b9e02df3c4d4c9811ed223c0103))
* **controllers:** update log level in congregation admin ([7558a03](https://github.com/sws2apps/sws2apps-api/commit/7558a0308f22d4056daaf2cedd2a05e1c6dce0fe))

# [3.3.0](https://github.com/sws2apps/sws2apps-api/compare/v3.2.0...v3.3.0) (2024-12-05)


### Bug Fixes

* **api:** allow admin role to backup field service reports ([0b63512](https://github.com/sws2apps/sws2apps-api/commit/0b635122943cd3e3f59234fac83584061de15383))
* **backup:** user field service reports and bible studies not included ([16075d2](https://github.com/sws2apps/sws2apps-api/commit/16075d27b1e1c1d0aa3fb8ea87f4bad1c1beb39e))


### Features

* **deps:** bump dotenv from 16.4.6 to 16.4.7 ([57abdc4](https://github.com/sws2apps/sws2apps-api/commit/57abdc49ffabca23087feb4d3f2f78ca46c77350))
* **deps:** bump i18next from 24.0.2 to 24.0.5 ([a644d12](https://github.com/sws2apps/sws2apps-api/commit/a644d125f0687a762ae8e82b5124d33d9198fa9d))

# [3.2.0](https://github.com/sws2apps/sws2apps-api/compare/v3.1.3...v3.2.0) (2024-12-03)


### Bug Fixes

* **middleware:** update bearer checker for undefined string ([7dcb616](https://github.com/sws2apps/sws2apps-api/commit/7dcb61611b85352919a60365e43c7aacd915f375))


### Features

* **deps:** bump dotenv from 16.4.5 to 16.4.6 ([fb4ea96](https://github.com/sws2apps/sws2apps-api/commit/fb4ea96fe5fec4ff1d42c0017a29cdc64e9db0fe))

## [3.1.3](https://github.com/sws2apps/sws2apps-api/compare/v3.1.2...v3.1.3) (2024-12-02)


### Bug Fixes

* **api:** use user id to check valid congregation request ([ef0d88a](https://github.com/sws2apps/sws2apps-api/commit/ef0d88aa92edf6975229b358a043d9efd96e1868))

## [3.1.2](https://github.com/sws2apps/sws2apps-api/compare/v3.1.1...v3.1.2) (2024-12-01)


### Bug Fixes

* **controllers:** allow admin users to get additional backup fields ([0d85251](https://github.com/sws2apps/sws2apps-api/commit/0d85251a35033b2f488b6f852695fd214f12a52e))

## [3.1.1](https://github.com/sws2apps/sws2apps-api/compare/v3.1.0...v3.1.1) (2024-12-01)


### Bug Fixes

* **v3:** update error code for invalid invitation code ([0a82440](https://github.com/sws2apps/sws2apps-api/commit/0a8244068e661cb34427e31e5f5cb5ec96bfe865))

# [3.1.0](https://github.com/sws2apps/sws2apps-api/compare/v3.0.0...v3.1.0) (2024-11-26)


### Bug Fixes

* **api:** update cors options ([dc57485](https://github.com/sws2apps/sws2apps-api/commit/dc5748587c162071359103467f1262911f11eda7))
* **api:** update firestore path ([cf8bd2f](https://github.com/sws2apps/sws2apps-api/commit/cf8bd2f4c62ecd0b953bfc09a1ca56f1851f1225))
* **controllers:** update error message key ([eab1545](https://github.com/sws2apps/sws2apps-api/commit/eab1545e31c2486f7a4d470383de6fe3287d06fa))
* **v2:** use hardcoded strings for emails ([c10a1b1](https://github.com/sws2apps/sws2apps-api/commit/c10a1b1bb576aed7dc0f322377ace9d1fabe731a))


### Features

* **api:** delete users and congregations from frontend ([e3de0d3](https://github.com/sws2apps/sws2apps-api/commit/e3de0d3db8da0339452acb8ad9c0c82bd651e34c))
* **deps:** bump firebase-admin from 13.0.0 to 13.0.1 ([e33b1fa](https://github.com/sws2apps/sws2apps-api/commit/e33b1fa5e0dd4f7579508edc6239aa7fc6a17784))
* **deps:** bump i18next from 23.16.5 to 23.16.6 ([a28cfa9](https://github.com/sws2apps/sws2apps-api/commit/a28cfa9d05d0e6767e7aeb396bffad545b51585d))
* **deps:** bump i18next from 23.16.6 to 23.16.8 ([72eb5e9](https://github.com/sws2apps/sws2apps-api/commit/72eb5e95cfd343df03739d89d04325ed22d7bc48))
* **deps:** bump i18next from 23.16.8 to 24.0.2 ([6ff365d](https://github.com/sws2apps/sws2apps-api/commit/6ff365d30aacb80dce6ed08270bd49a7e23f87f6))
* **deps:** bump i18next-http-middleware from 3.6.0 to 3.7.0 ([69ae306](https://github.com/sws2apps/sws2apps-api/commit/69ae306ba1162e0544c586e00c4e3f90ed1bde4a))
* **v3:** get user auto-updated roles ([802fa0c](https://github.com/sws2apps/sws2apps-api/commit/802fa0c33b7bbbd8af7fc76cb7bbebf866d598d6))

# [3.0.0](https://github.com/sws2apps/sws2apps-api/compare/v2.100.0...v3.0.0) (2024-11-18)

- **api:** support v2 and v3 routes ([ba0e845](https://github.com/sws2apps/sws2apps-api/commit/ba0e8452ffcbb85bd91a4f48a1b3532cbd091468))

### BREAKING CHANGES

- This requires all CPE clients to be updated
