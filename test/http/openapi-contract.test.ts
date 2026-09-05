import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

type OpenApiOperation = {
	operationId?: string;
	parameters?: { $ref?: string }[];
	security?: Record<string, unknown[]>[];
};

type OpenApiDocument = {
	openapi?: string;
	servers?: { url?: string }[];
	paths?: Record<string, Record<string, OpenApiOperation>>;
	components?: {
		securitySchemes?: Record<string, unknown>;
	};
};

const contractPath = path.join(process.cwd(), 'docs', 'openapi', 'openapi.json');

const loadContract = async (): Promise<OpenApiDocument> => {
	const contractSource = await readFile(contractPath, 'utf8');
	return JSON.parse(contractSource) as OpenApiDocument;
};

const httpMethods = new Set(['delete', 'get', 'patch', 'post', 'put']);

const getDocumentedMethods = (pathItem: Record<string, OpenApiOperation>) => {
	return Object.keys(pathItem).filter((method) => httpMethods.has(method));
};

const collectLocalReferences = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.flatMap(collectLocalReferences);
	}

	if (typeof value !== 'object' || value === null) {
		return [];
	}

	return Object.entries(value).flatMap(([key, nestedValue]) => {
		if (key === '$ref' && typeof nestedValue === 'string' && nestedValue.startsWith('#/')) {
			return [nestedValue];
		}

		return collectLocalReferences(nestedValue);
	});
};

const resolveLocalReference = (document: OpenApiDocument, reference: string) => {
	let currentValue: unknown = document;

	for (const pathSegment of reference.slice(2).split('/')) {
		if (typeof currentValue !== 'object' || currentValue === null || !(pathSegment in currentValue)) {
			return undefined;
		}

		currentValue = (currentValue as Record<string, unknown>)[pathSegment];
	}

	return currentValue;
};

describe('OpenAPI contract', () => {
	it('uses OpenAPI 3.1 and the versioned API base path', async () => {
		const contract = await loadContract();

		assert.equal(contract.openapi, '3.1.0');
		assert.equal(contract.servers?.[0]?.url, '/api/v3');
	});

	it('documents every completed contract group', async () => {
		const contract = await loadContract();
		const expectedOperations = {
			'/admin': 'get',
			'/admin/client-version': ['get', 'post'],
			'/admin/congregations': ['get', 'post'],
			'/admin/congregations/{id}': ['delete', 'get', 'patch'],
			'/admin/congregations/{id}/data-sync': 'patch',
			'/admin/congregations/{id}/feature-flags': 'patch',
			'/admin/congregations/{id}/requests/{request}': 'delete',
			'/admin/congregations/{id}/speakers-key': 'delete',
			'/admin/flags': ['get', 'post'],
			'/admin/flags/{id}': ['delete', 'patch'],
			'/admin/flags/{id}/toggle': 'get',
			'/admin/logout': 'get',
			'/admin/users': 'get',
			'/admin/users/{id}': ['delete', 'patch'],
			'/admin/users/{id}/congregation': ['delete', 'patch'],
			'/admin/users/{id}/disable-2fa': 'get',
			'/admin/users/{id}/feature-flags': 'patch',
			'/admin/users/{id}/revoke-token': 'get',
			'/admin/users/{id}/sessions': 'delete',
			'/congregations': 'put',
			'/congregations/admin/{id}/access-code': ['get', 'post'],
			'/congregations/admin/{id}/erase': 'delete',
			'/congregations/admin/{id}/join-requests': ['delete', 'patch'],
			'/congregations/admin/{id}/local-uid': 'post',
			'/congregations/admin/{id}/master-key': ['get', 'post'],
			'/congregations/admin/{id}/pocket-user': 'post',
			'/congregations/admin/{id}/pocket-user/{user}': 'delete',
			'/congregations/admin/{id}/users': ['get', 'post'],
			'/congregations/admin/{id}/users/global': 'get',
			'/congregations/admin/{id}/users/{user}': ['delete', 'patch'],
			'/congregations/admin/{id}/users/{user}/sessions': 'delete',
			'/congregations/countries': 'get',
			'/congregations/meeting/{id}/schedules': ['get', 'post'],
			'/congregations/meeting/{id}/visiting-speakers/access': 'get',
			'/congregations/meeting/{id}/visiting-speakers/congregations': 'get',
			'/congregations/meeting/{id}/visiting-speakers/pending-access': 'get',
			'/congregations/meeting/{id}/visiting-speakers/request': 'post',
			'/congregations/meeting/{id}/visiting-speakers/request/approve': 'post',
			'/congregations/meeting/{id}/visiting-speakers/request/reject': 'post',
			'/congregations/search': 'get',
			'/congregations/{id}/applications/{request}': ['delete', 'patch'],
			'/mfa/verify-token': 'post',
			'/pockets/applications': ['get', 'post'],
			'/pockets/backup': ['get', 'post'],
			'/pockets/erase': 'delete',
			'/pockets/field-service-reports': 'post',
			'/pockets/sessions': ['delete', 'get'],
			'/pockets/signup': 'post',
			'/pockets/validate-me': 'get',
			'/public/feature-flags': 'get',
			'/public/stats': 'get',
			'/user-login': 'get',
			'/user-passwordless-login': 'post',
			'/user-passwordless-verify': 'post',
			'/users/logout': 'get',
			'/users/validate-me': 'get',
			'/users/{id}/2fa': 'get',
			'/users/{id}/2fa/disable': 'get',
			'/users/{id}/applications': ['get', 'post'],
			'/users/{id}/backup': ['get', 'post'],
			'/users/{id}/backup/chunked': 'post',
			'/users/{id}/erase': 'delete',
			'/users/{id}/feedback': 'post',
			'/users/{id}/field-service-reports': 'post',
			'/users/{id}/join-congregation': 'post',
			'/users/{id}/sessions': ['delete', 'get'],
			'/users/{id}/updates-routine': 'get',
			'/verify-email-token': 'post',
		} satisfies Record<string, string | string[]>;

		assert.deepEqual(Object.keys(contract.paths ?? {}).sort(), Object.keys(expectedOperations).sort());

		for (const [documentedPath, expectedMethod] of Object.entries(expectedOperations)) {
			const pathItem = contract.paths?.[documentedPath];
			assert.ok(pathItem, `${documentedPath} is missing`);
			const expectedMethods = Array.isArray(expectedMethod) ? expectedMethod : [expectedMethod];
			assert.deepEqual(getDocumentedMethods(pathItem).sort(), expectedMethods.sort());
		}
	});

	it('assigns a unique operation ID to every documented operation', async () => {
		const contract = await loadContract();
		const operationIds: string[] = [];

		for (const pathItem of Object.values(contract.paths ?? {})) {
			for (const [method, operation] of Object.entries(pathItem)) {
				if (!httpMethods.has(method)) continue;

				assert.ok(operation.operationId, `${method.toUpperCase()} operation is missing an operationId`);
				operationIds.push(operation.operationId);
			}
		}

		assert.equal(new Set(operationIds).size, operationIds.length);
	});

	it('defines the authentication mechanisms used by session-capable routes', async () => {
		const contract = await loadContract();
		const securitySchemes = contract.components?.securitySchemes ?? {};

		assert.ok('bearerAuth' in securitySchemes);
		assert.ok('visitorCookie' in securitySchemes);
	});

	it('requires both credentials for authenticated account operations', async () => {
		const contract = await loadContract();
		const authenticatedOperations = [
			['/congregations', 'put'],
			['/congregations/countries', 'get'],
			['/congregations/meeting/{id}/schedules', 'get'],
			['/congregations/meeting/{id}/schedules', 'post'],
			['/congregations/meeting/{id}/visiting-speakers/access', 'get'],
			['/congregations/meeting/{id}/visiting-speakers/congregations', 'get'],
			['/congregations/meeting/{id}/visiting-speakers/pending-access', 'get'],
			['/congregations/meeting/{id}/visiting-speakers/request', 'post'],
			['/congregations/meeting/{id}/visiting-speakers/request/approve', 'post'],
			['/congregations/meeting/{id}/visiting-speakers/request/reject', 'post'],
			['/congregations/search', 'get'],
			['/congregations/{id}/applications/{request}', 'delete'],
			['/congregations/{id}/applications/{request}', 'patch'],
			['/mfa/verify-token', 'post'],
			['/users/logout', 'get'],
			['/users/validate-me', 'get'],
			['/users/{id}/2fa', 'get'],
			['/users/{id}/2fa/disable', 'get'],
			['/users/{id}/applications', 'get'],
			['/users/{id}/applications', 'post'],
			['/users/{id}/backup', 'get'],
			['/users/{id}/backup', 'post'],
			['/users/{id}/backup/chunked', 'post'],
			['/users/{id}/erase', 'delete'],
			['/users/{id}/feedback', 'post'],
			['/users/{id}/field-service-reports', 'post'],
			['/users/{id}/join-congregation', 'post'],
			['/users/{id}/sessions', 'delete'],
			['/users/{id}/sessions', 'get'],
			['/users/{id}/updates-routine', 'get'],
		] as const;

		for (const [documentedPath, method] of authenticatedOperations) {
			const operation = contract.paths?.[documentedPath]?.[method];
			assert.deepEqual(operation?.security, [{ bearerAuth: [], visitorCookie: [] }]);
		}
	});

	it('uses only the signed cookie after Pocket invitation authentication', async () => {
		const contract = await loadContract();
		const pocketSessionOperations = [
			['/pockets/applications', 'get'],
			['/pockets/applications', 'post'],
			['/pockets/backup', 'get'],
			['/pockets/backup', 'post'],
			['/pockets/erase', 'delete'],
			['/pockets/field-service-reports', 'post'],
			['/pockets/sessions', 'delete'],
			['/pockets/sessions', 'get'],
			['/pockets/validate-me', 'get'],
		] as const;

		assert.equal(contract.paths?.['/pockets/signup']?.post.security, undefined);

		for (const [documentedPath, method] of pocketSessionOperations) {
			const operation = contract.paths?.[documentedPath]?.[method];
			assert.deepEqual(operation?.security, [{ visitorCookie: [] }]);
		}
	});

	it('requires both credentials for every global administration operation', async () => {
		const contract = await loadContract();
		const administrationPaths = Object.entries(contract.paths ?? {}).filter(([documentedPath]) => {
			return documentedPath === '/admin' || documentedPath.startsWith('/admin/');
		});

		assert.ok(administrationPaths.length > 0);

		for (const [documentedPath, pathItem] of administrationPaths) {
			for (const method of getDocumentedMethods(pathItem)) {
				const operation = pathItem[method];
				assert.deepEqual(
					operation.security,
					[{ bearerAuth: [], visitorCookie: [] }],
					`${method.toUpperCase()} ${documentedPath} must require the complete administrator session`,
				);
			}
		}
	});

	it('requires both credentials for every congregation administration operation', async () => {
		const contract = await loadContract();
		const administrationPaths = Object.entries(contract.paths ?? {}).filter(([documentedPath]) => {
			return documentedPath.startsWith('/congregations/admin/');
		});

		assert.ok(administrationPaths.length > 0);

		for (const [documentedPath, pathItem] of administrationPaths) {
			for (const method of getDocumentedMethods(pathItem)) {
				const operation = pathItem[method];
				assert.deepEqual(
					operation.security,
					[{ bearerAuth: [], visitorCookie: [] }],
					`${method.toUpperCase()} ${documentedPath} must require the complete congregation administrator session`,
				);
			}
		}
	});

	it('does not contain dangling local references', async () => {
		const contract = await loadContract();
		const references = collectLocalReferences(contract);

		assert.ok(references.length > 0);

		for (const reference of references) {
			assert.notEqual(resolveLocalReference(contract, reference), undefined, `${reference} does not resolve`);
		}
	});
});
