import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

export type ApiRouteInventory = Record<string, string[]>;

const supportedHttpMethods = new Set(['delete', 'get', 'patch', 'post', 'put']);
const apiRouterPath = path.join(process.cwd(), 'src', 'http', 'api-v3.routes.ts');

type MountedRouteModule = {
	moduleName: string;
	mountPath: string;
};

const readTypeScriptFile = async (filePath: string) => {
	const source = await readFile(filePath, 'utf8');

	return ts.createSourceFile(
		filePath,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
};

const getMountedRouteModules = async (): Promise<MountedRouteModule[]> => {
	const sourceFile = await readTypeScriptFile(apiRouterPath);
	const importedRouteModules = new Map<string, string>();

	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;

		const importPath = statement.moduleSpecifier.text;
		const routeModuleMatch = importPath.match(/^#modules\/([^/]+)\/routes\.js$/);
		const localName = statement.importClause?.name?.text;

		if (routeModuleMatch?.[1] && localName) {
			importedRouteModules.set(localName, routeModuleMatch[1]);
		}
	}

	const mountedModules: MountedRouteModule[] = [];

	const visitNode = (node: ts.Node) => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const receiver = node.expression.expression;
			const methodName = node.expression.name.text;
			const [mountPathNode, routerNode] = node.arguments;

			if (
				methodName === 'use'
				&& ts.isIdentifier(receiver)
				&& receiver.text === 'apiV3Router'
				&& mountPathNode
				&& ts.isStringLiteral(mountPathNode)
				&& routerNode
				&& ts.isIdentifier(routerNode)
			) {
				const moduleName = importedRouteModules.get(routerNode.text);

				if (moduleName) {
					mountedModules.push({ moduleName, mountPath: mountPathNode.text });
				}
			}
		}

		ts.forEachChild(node, visitNode);
	};

	visitNode(sourceFile);

	if (mountedModules.length !== importedRouteModules.size) {
		throw new Error('Every imported API route module must have one literal apiV3Router.use() mount.');
	}

	return mountedModules;
};

const resolveRouteImplementation = async (moduleName: string) => {
	const entrypointPath = path.join(process.cwd(), 'src', 'modules', moduleName, 'routes.ts');
	const entrypoint = await readTypeScriptFile(entrypointPath);

	for (const statement of entrypoint.statements) {
		if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
		if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

		const implementationPath = statement.moduleSpecifier.text;
		if (!implementationPath.endsWith('.routes.js')) continue;

		return path.resolve(
			path.dirname(entrypointPath),
			implementationPath.replace(/\.js$/, '.ts'),
		);
	}

	throw new Error(`${entrypointPath} must re-export a literal *.routes.js implementation.`);
};

const findRouterNames = (sourceFile: ts.SourceFile) => {
	const routerNames = new Set<string>();

	const visitNode = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node)
			&& ts.isIdentifier(node.name)
			&& node.initializer
			&& ts.isCallExpression(node.initializer)
			&& ts.isPropertyAccessExpression(node.initializer.expression)
			&& node.initializer.expression.name.text === 'Router'
		) {
			routerNames.add(node.name.text);
		}

		ts.forEachChild(node, visitNode);
	};

	visitNode(sourceFile);
	return routerNames;
};

const getModuleRoutes = async (moduleName: string) => {
	const implementationPath = await resolveRouteImplementation(moduleName);
	const sourceFile = await readTypeScriptFile(implementationPath);
	const routerNames = findRouterNames(sourceFile);
	const routes: { method: string; path: string }[] = [];

	const visitNode = (node: ts.Node) => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const receiver = node.expression.expression;
			const method = node.expression.name.text;

			if (ts.isIdentifier(receiver) && routerNames.has(receiver.text) && supportedHttpMethods.has(method)) {
				const routePathNode = node.arguments[0];

				if (!routePathNode || !ts.isStringLiteral(routePathNode)) {
					throw new Error(`${implementationPath} must register ${method.toUpperCase()} with a literal path.`);
				}

				routes.push({ method, path: routePathNode.text });
			}
		}

		ts.forEachChild(node, visitNode);
	};

	visitNode(sourceFile);
	return routes;
};

const joinRoutePath = (mountPath: string, modulePath: string) => {
	const normalizedMount = mountPath === '/' ? '' : mountPath.replace(/\/$/, '');
	const normalizedModulePath = modulePath === '/' ? '' : modulePath;
	const expressPath = `${normalizedMount}${normalizedModulePath}` || '/';

	return expressPath.replace(/:(\w+)/g, '{$1}');
};

export const discoverApiRoutes = async (): Promise<ApiRouteInventory> => {
	const routeInventory = new Map<string, Set<string>>();
	const mountedModules = await getMountedRouteModules();

	for (const { moduleName, mountPath } of mountedModules) {
		const moduleRoutes = await getModuleRoutes(moduleName);

		for (const moduleRoute of moduleRoutes) {
			const apiPath = joinRoutePath(mountPath, moduleRoute.path);
			const methods = routeInventory.get(apiPath) ?? new Set<string>();

			methods.add(moduleRoute.method);
			routeInventory.set(apiPath, methods);
		}
	}

	return Object.fromEntries(
		[...routeInventory.entries()]
			.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
			.map(([apiPath, methods]) => [apiPath, [...methods].sort((leftMethod, rightMethod) => leftMethod.localeCompare(rightMethod))]),
	);
};
