import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

type OpenApiOperation = {
	operationId?: string;
	parameters?: { $ref?: string }[];
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

	it('documents the public and authentication foundation', async () => {
		const contract = await loadContract();
		const expectedOperations = {
			'/public/feature-flags': 'get',
			'/public/stats': 'get',
			'/user-login': 'get',
			'/user-passwordless-login': 'post',
			'/user-passwordless-verify': 'post',
			'/verify-email-token': 'post',
		};

		assert.deepEqual(Object.keys(contract.paths ?? {}).sort(), Object.keys(expectedOperations).sort());

		for (const [documentedPath, expectedMethod] of Object.entries(expectedOperations)) {
			const pathItem = contract.paths?.[documentedPath];
			assert.ok(pathItem, `${documentedPath} is missing`);
			assert.deepEqual(getDocumentedMethods(pathItem), [expectedMethod]);
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

	it('does not contain dangling local references', async () => {
		const contract = await loadContract();
		const references = collectLocalReferences(contract);

		assert.ok(references.length > 0);

		for (const reference of references) {
			assert.notEqual(resolveLocalReference(contract, reference), undefined, `${reference} does not resolve`);
		}
	});
});
