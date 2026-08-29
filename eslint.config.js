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
							group: ['**/platform/**', '**/*.repository.js', 'firebase-admin', 'firebase-admin/*'],
							message: 'Controllers must use a service instead of platform or repository code.',
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
];
