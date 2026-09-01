import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

const featureModuleNames = [
	'administration',
	'auth',
	'backups',
	'congregation-administration',
	'congregations',
	'feature-flags',
	'installations',
	'meetings',
	'mfa',
	'pockets',
	'public-api',
	'users',
];

const escapedModuleNames = featureModuleNames.map((name) => name.replaceAll('-', '\\-')).join('|');
const relativeFeatureImport = new RegExp(`^(?:\\.\\./)+(${escapedModuleNames})/(.+)$`);
const applicationFeatureImport = new RegExp(`(?:^#modules/|(?:^|/)modules/)(${escapedModuleNames})/(.+)$`);

const moduleBoundaryPlugin = {
	rules: {
		'public-entrypoint': {
			meta: {
				type: 'problem',
				docs: {
					description: 'Require consumers to import feature modules through their public entrypoint.',
				},
				schema: [],
			},
			create(context) {
				return {
					ImportDeclaration(node) {
						const importPath = node.source.value;

						if (typeof importPath !== 'string') return;

						const featureImport = relativeFeatureImport.exec(importPath) ?? applicationFeatureImport.exec(importPath);

						const isPublicEntrypoint = featureImport?.[2] === 'index.js' || featureImport?.[2] === 'routes.js';

						if (!featureImport || isPublicEntrypoint) return;

						context.report({
							node: node.source,
							message: `Import ${featureImport[1]} through its public index.js entrypoint.`,
						});
					},
				};
			},
		},
	},
};

export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{ languageOptions: { globals: globals.node } },
	{ ignores: ['**/*.js'] },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.ts'],
		plugins: {
			boundaries: moduleBoundaryPlugin,
		},
		rules: {
			'no-console': 'error',
			'boundaries/public-entrypoint': 'error',
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
								'express-validator',
								'firebase-admin',
								'firebase-admin/*',
							],
							message:
								'Controllers must use HTTP helpers and services instead of validation, platform, repository, or collection code.',
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
							group: [
								'**/users/users.js',
								'**/congregations/congregations.js',
								'**/platform/firebase/authentication.js',
							],
							message: 'Repositories must persist supplied data instead of coordinating collections or authentication.',
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
			'src/modules/feature-flags/flags.ts',
			'src/modules/installations/installation-list.ts',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'**/platform/**',
								'**/*.repository.js',
								'**/*.service.js',
								'firebase-admin',
								'firebase-admin/*',
							],
							message: 'Application caches must contain only state and lookup operations.',
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
							group: [
								'**/platform/firebase/**',
								'**/platform/encryption/**',
								'**/congregations/congregations.js',
								'**/users/users.js',
								'firebase-admin',
								'firebase-admin/*',
							],
							message: 'The congregation aggregate must use repositories and services instead of Firebase or global collections.',
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
								'**/platform/firebase/**',
								'**/platform/encryption/**',
								'**/congregations/congregations.js',
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
							group: [
								'**/platform/firebase/**',
								'**/users/users.js',
								'firebase-admin',
								'firebase-admin/*',
							],
							message: 'Authentication middleware must use authentication services for user and Firebase operations.',
						},
					],
				},
			],
		},
	},
];
