## [3.26.1](https://github.com/sws2apps/sws2apps-api/compare/v3.26.0...v3.26.1) (2025-06-01)


### Bug Fixes

* **definition:** add user profile schema ([8cc0e53](https://github.com/sws2apps/sws2apps-api/commit/8cc0e536c1c093243d1c6f8901ff7ed20902fa49))


### Performance Improvements

* **controllers:** check for talks data before saving public schedules ([98ed7b4](https://github.com/sws2apps/sws2apps-api/commit/98ed7b40d47331656489ca1da06645c6ca7cf538))

# [3.26.0](https://github.com/sws2apps/sws2apps-api/compare/v3.25.2...v3.26.0) (2025-05-31)


### Bug Fixes

* **controllers:** check for enabled flags before coverage check ([c320eca](https://github.com/sws2apps/sws2apps-api/commit/c320eca67831fd6f83e499599d4ecdef9de9c22a))


### Features

* **controllers:** include additional data to minimal persons list ([05d30b7](https://github.com/sws2apps/sws2apps-api/commit/05d30b719ef4551277cca53abd62c7ea74570749))
* **deps:** bump @crowdin/crowdin-api-client from 1.43.0 to 1.44.0 ([b8ea911](https://github.com/sws2apps/sws2apps-api/commit/b8ea9117b11785915f174fd6764d4225c1a0caa6))
* **deps:** bump i18next from 25.2.0 to 25.2.1 ([1b291bd](https://github.com/sws2apps/sws2apps-api/commit/1b291bd0b0046efcb48009f96f71ac7974819f32))
* **logger:** log memory usage ([11280ad](https://github.com/sws2apps/sws2apps-api/commit/11280ad8b91c1f29b65ae6a6f0effc609cd7f720))


### Performance Improvements

* **api:** testing cold start tolerance ([427b592](https://github.com/sws2apps/sws2apps-api/commit/427b5921daa880336e92f06101480cdf234432cc))
* **api:** use conditional check for server readiness ([0545e87](https://github.com/sws2apps/sws2apps-api/commit/0545e87c90ebe4c8de961dab8aa89b854ffaeaa2))

## [3.25.2](https://github.com/sws2apps/sws2apps-api/compare/v3.25.1...v3.25.2) (2025-05-25)


### Bug Fixes

* **logger:** update logger format ([c86cabf](https://github.com/sws2apps/sws2apps-api/commit/c86cabffbf782ca26154b9a038b48ce2bf5b40a3))

## [3.25.1](https://github.com/sws2apps/sws2apps-api/compare/v3.25.0...v3.25.1) (2025-05-23)


### Bug Fixes

* **controllers:** allow decline join request to remove outdated records ([fb54851](https://github.com/sws2apps/sws2apps-api/commit/fb548510bae3fcedda133ad3fa6e13aae5e37e19))
* **controllers:** update congregation delete user to use remove congregation action ([8f3b5d2](https://github.com/sws2apps/sws2apps-api/commit/8f3b5d2182acdd488d83a20cf73e082ee98001a5))
* **deps:** add logtail ingesting host ([b2c4766](https://github.com/sws2apps/sws2apps-api/commit/b2c4766124676400631b298d38bf0dab75f178a1))


### Performance Improvements

* **controller:** log user outdated metadata ([f34ee5b](https://github.com/sws2apps/sws2apps-api/commit/f34ee5b9ab68166c7c0650e7a31e620b2d5cc405))
* **services:** handle local ip address ([c8ac6e0](https://github.com/sws2apps/sws2apps-api/commit/c8ac6e0a9cd0b4a0659b0f2b8548c2276000c81f))

# [3.25.0](https://github.com/sws2apps/sws2apps-api/compare/v3.24.1...v3.25.0) (2025-05-21)


### Features

* **controllers:** update backup data for language groups requirement ([0369d7d](https://github.com/sws2apps/sws2apps-api/commit/0369d7d78df279b1a5f3835ea92aefade60ec957))

## [3.24.1](https://github.com/sws2apps/sws2apps-api/compare/v3.24.0...v3.24.1) (2025-05-20)


### Bug Fixes

* **locales:** update default language code for i18n ([1a86d80](https://github.com/sws2apps/sws2apps-api/commit/1a86d80252fc3214bda9e4c6809de238220d93bd))

# [3.24.0](https://github.com/sws2apps/sws2apps-api/compare/v3.23.0...v3.24.0) (2025-05-20)


### Bug Fixes

* **api:** get correct locale for email message ([ac583e8](https://github.com/sws2apps/sws2apps-api/commit/ac583e83a79e863434d52f62c375ea04491ab9e3))
* **constant:** update locale key from email localization ([ff1a939](https://github.com/sws2apps/sws2apps-api/commit/ff1a9398d02d0c2fd8565e367d9428fc07484cc6))
* **controllers:** add missing import for languages ([c2ee956](https://github.com/sws2apps/sws2apps-api/commit/c2ee956c7fb002fe97211f5c3411fe2b7bcab6d4))


### Features

* **deps:** bump @logtail/node from 0.5.4 to 0.5.5 ([1c5bf2c](https://github.com/sws2apps/sws2apps-api/commit/1c5bf2ca40a46eeddd9c3756d32346a13cab5d3c))
* **deps:** bump i18next from 25.1.3 to 25.2.0 ([d3ac2ed](https://github.com/sws2apps/sws2apps-api/commit/d3ac2edc67780d85aa89cffb818585ba051a187a))

# [3.23.0](https://github.com/sws2apps/sws2apps-api/compare/v3.22.0...v3.23.0) (2025-05-18)


### Bug Fixes

* **classes:** update validation check to save backup data ([f951408](https://github.com/sws2apps/sws2apps-api/commit/f951408b23fd452bc1d1ce9992824306f484a50b))


### Features

* **admin:** create route for resetting speakers key ([f95ddbc](https://github.com/sws2apps/sws2apps-api/commit/f95ddbcd485dc4f942f830440ff9e69b70413666))
* **deps:** bump i18next from 25.1.2 to 25.1.3 ([277842d](https://github.com/sws2apps/sws2apps-api/commit/277842d3e3441479000953f005af92d2194e9ec0))
* **deps:** bump sanitize-html from 2.16.0 to 2.17.0 ([cf98f49](https://github.com/sws2apps/sws2apps-api/commit/cf98f4984a9b4de33c09f6063d4384cc391dcc21))

# [3.22.0](https://github.com/sws2apps/sws2apps-api/compare/v3.21.0...v3.22.0) (2025-05-13)


### Features

* **controllers:** enable adding users to custom congregation ([52c2ee5](https://github.com/sws2apps/sws2apps-api/commit/52c2ee55207b7431dc4b29aff721830c54815daa))
* **controllers:** enable creating custom congregation ([d0760cf](https://github.com/sws2apps/sws2apps-api/commit/d0760cf30c3a3563e50100a6aa47f345cb8cd009))
* **deps:** bump firebase-admin from 13.3.0 to 13.4.0 ([4b892c3](https://github.com/sws2apps/sws2apps-api/commit/4b892c352a3bd5c10a46e41b5573b73c36a3b082))

# [3.21.0](https://github.com/sws2apps/sws2apps-api/compare/v3.20.0...v3.21.0) (2025-05-12)


### Bug Fixes

* **utils:** some congregation settings not saved ([38b64bc](https://github.com/sws2apps/sws2apps-api/commit/38b64bca8df00c0c3f84a5d5099f1b1ac1e4eed3))


### Features

* **deps:** bump bcrypt from 5.1.1 to 6.0.0 ([981a4be](https://github.com/sws2apps/sws2apps-api/commit/981a4be9754a2b96a67c09710e3ba2e48fbdd420))

# [3.20.0](https://github.com/sws2apps/sws2apps-api/compare/v3.19.0...v3.20.0) (2025-05-11)


### Bug Fixes

* **classes:** remove invalid data type in congregation settings ([d610cf2](https://github.com/sws2apps/sws2apps-api/commit/d610cf2cb3f78b0d6845e0eac02b5bb9b6c7a955))


### Features

* **classes:** only update valid sessions if changed ([12db335](https://github.com/sws2apps/sws2apps-api/commit/12db3358d6c5253e22bf1be55a4c2a010b972b8c))

# [3.19.0](https://github.com/sws2apps/sws2apps-api/compare/v3.18.0...v3.19.0) (2025-05-11)


### Bug Fixes

* **classes:** update merge logic of congregation settings ([f9b9468](https://github.com/sws2apps/sws2apps-api/commit/f9b9468bd330806a99917743519552ffab44501e))


### Features

* **classes:** remove outdated user sessions on restart ([8a22cdc](https://github.com/sws2apps/sws2apps-api/commit/8a22cdccf1cefafacf424d060144a2255c7c984d))
* **deps:** bump @crowdin/crowdin-api-client from 1.42.0 to 1.43.0 ([f59ce23](https://github.com/sws2apps/sws2apps-api/commit/f59ce2316feebda054fd7d413a43dc58194acb50))
* **deps:** bump i18next from 25.0.1 to 25.0.2 ([0481138](https://github.com/sws2apps/sws2apps-api/commit/048113824fd359a7c8771c97240a9d716ec40e80))
* **deps:** bump i18next from 25.0.2 to 25.1.1 ([6b156d5](https://github.com/sws2apps/sws2apps-api/commit/6b156d5d0ba4a386dca91e52a17b743527fa0de1))
* **deps:** bump i18next from 25.1.1 to 25.1.2 ([51add91](https://github.com/sws2apps/sws2apps-api/commit/51add9153093aa182c49864bc91be2fac6328908))
* **deps:** bump nodemailer from 6.10.1 to 7.0.2 ([53469da](https://github.com/sws2apps/sws2apps-api/commit/53469da68130b43cb66be2cc72ce6af96562f132))
* **deps:** bump nodemailer from 7.0.2 to 7.0.3 ([dc30885](https://github.com/sws2apps/sws2apps-api/commit/dc3088507739f53117c3949cff201bf2693366ec))

# [3.18.0](https://github.com/sws2apps/sws2apps-api/compare/v3.17.0...v3.18.0) (2025-04-27)


### Features

* **deps:** bump @logtail/node from 0.5.2 to 0.5.4 ([77d7f26](https://github.com/sws2apps/sws2apps-api/commit/77d7f2678cb1a123319a916cb6b8ca6f5244ba31))
* **deps:** bump firebase-admin from 13.2.0 to 13.3.0 ([dfe042c](https://github.com/sws2apps/sws2apps-api/commit/dfe042c7b3c0492de6778bd6a4d3ff689397fbf3))
* **deps:** bump i18next from 25.0.0 to 25.0.1 ([7abd44f](https://github.com/sws2apps/sws2apps-api/commit/7abd44fa7c54057792024268eb26066a0e52ab00))
* **deps:** bump i18next-http-middleware from 3.7.2 to 3.7.4 ([c915aeb](https://github.com/sws2apps/sws2apps-api/commit/c915aeb52ebb3d11d0b5e0eeb22c23d330fd9720))
* **deps:** bump sanitize-html from 2.15.0 to 2.16.0 ([201f6c0](https://github.com/sws2apps/sws2apps-api/commit/201f6c0369c4a2c7d6879f7db0dfc4066b6c50b8))

# [3.17.0](https://github.com/sws2apps/sws2apps-api/compare/v3.16.0...v3.17.0) (2025-04-16)


### Features

* **definition:** add code for backup upcoming events ([42867de](https://github.com/sws2apps/sws2apps-api/commit/42867de2085da9a4724b8852b71627875e8674c7))
* **deps:** bump @crowdin/crowdin-api-client from 1.41.2 to 1.41.4 ([7f0e575](https://github.com/sws2apps/sws2apps-api/commit/7f0e57526f92c3d751bfe908513b86545fab59a9))
* **deps:** bump @crowdin/crowdin-api-client from 1.41.4 to 1.42.0 ([ea7f178](https://github.com/sws2apps/sws2apps-api/commit/ea7f178fb04de7d44092ce9aeea75e65e926aafa))
* **deps:** bump dotenv from 16.4.7 to 16.5.0 ([59fd5a7](https://github.com/sws2apps/sws2apps-api/commit/59fd5a77646651cf45cc587840ccf431ee6a9612))
* **deps:** bump express from 5.0.1 to 5.1.0 ([a68d5ec](https://github.com/sws2apps/sws2apps-api/commit/a68d5ec896abbddf75df98db324d35407604c6d9))
* **deps:** bump helmet from 8.0.0 to 8.1.0 ([aff8660](https://github.com/sws2apps/sws2apps-api/commit/aff86602550d82af292073b75c660e9f6779fdcc))
* **deps:** bump i18next from 24.2.3 to 25.0.0 ([45d1845](https://github.com/sws2apps/sws2apps-api/commit/45d1845b26c59c014a5a5d59d6e7220dce1d6e29))
* **deps:** bump i18next-http-middleware from 3.7.1 to 3.7.2 ([d02fde5](https://github.com/sws2apps/sws2apps-api/commit/d02fde5099db1387add2f8a0a453925f8465fa75))
* **deps:** bump jsdom from 26.0.0 to 26.1.0 ([402ac7a](https://github.com/sws2apps/sws2apps-api/commit/402ac7a5719cdf28a56566b63427694e2cd2b14b))
* **deps:** bump nodemailer from 6.10.0 to 6.10.1 ([7e40de7](https://github.com/sws2apps/sws2apps-api/commit/7e40de7e9f9013d0f2c57348ef1bd128f5a8e9a3))
* **deps:** bump otpauth from 9.3.6 to 9.4.0 ([e07df58](https://github.com/sws2apps/sws2apps-api/commit/e07df587235522845584e448e47ca7e6a34de4a0))
* **deps:** bump sanitize-html from 2.14.0 to 2.15.0 ([de82db4](https://github.com/sws2apps/sws2apps-api/commit/de82db484514ca13e0ebd460d07dd3c92fa292ba))

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
