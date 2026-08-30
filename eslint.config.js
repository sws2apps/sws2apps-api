import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{ languageOptions: { globals: globals.node } },
	{ ignores: ['**/*.js'] },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		rules: {
			'no-console': 'error',
		},
	},
	{
		files: ['src/platform/logging/logger.ts'],
		rules: {
			'no-console': 'off',
		},
	},
	{
		files: ['src/modules/**/*.controller.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'**/platform/**',
								'**/*.repository.js',
								'**/users/users.js',
								'**/congregations/congregations.js',
								'firebase-admin',
								'firebase-admin/*',
							],
							message:
								'Controllers must use a service instead of platform, repository, or collection code.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/modules/**/*.service.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['express', 'express/*'],
							message: 'Services must receive plain application data instead of Express types.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/modules/**/*.repository.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/users/users.js', '**/congregations/congregations.js'],
							message: 'Repositories must persist supplied data instead of reading application collections.',
						},
					],
				},
			],
		},
	},
	{
		files: [
			'src/modules/users/users.ts',
			'src/modules/congregations/congregations.ts',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/platform/**', 'firebase-admin', 'firebase-admin/*'],
							message: 'Application collections must delegate platform work to a lifecycle service or repository.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/modules/congregations/congregation.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/platform/firebase/**', 'firebase-admin', 'firebase-admin/*'],
							message: 'The congregation aggregate must use its repository for Firebase persistence.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/modules/users/user.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'**/platform/firebase/storage.js',
								'**/platform/visitor-details/**',
								'express',
								'express/*',
								'firebase-admin/storage',
							],
							message: 'The user aggregate must use repositories and services instead of HTTP or platform details.',
						},
					],
				},
			],
		},
	},
	{
		files: ['src/http/middleware/session-authentication.middleware.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/platform/firebase/**', 'firebase-admin', 'firebase-admin/*'],
							message: 'Authentication middleware must use the authentication service for Firebase operations.',
						},
					],
				},
			],
		},
	},
];
