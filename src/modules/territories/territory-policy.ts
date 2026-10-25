import { TerritoryError } from './territory.types.js';
import type {
	TerritoryActor,
	TerritoryGrant,
	TerritoryPolicy,
	TerritoryRecord,
} from './territory.types.js';

const managerRoles = new Set(['admin', 'coordinator', 'secretary', 'service_overseer', 'elder']);

export const isTerritoryManager = (actor: TerritoryActor): boolean =>
	actor.roles.some((role) => managerRoles.has(role));

export const requireTerritoryManager = (actor: TerritoryActor): void => {
	if (!isTerritoryManager(actor)) throw new TerritoryError('UNAUTHORIZED_ACCESS');
};

export const getTerritoryGrant = (
	actor: TerritoryActor,
	policy: TerritoryPolicy,
): TerritoryGrant | undefined => policy.grants.find((grant) => grant.personId === actor.personId);

export const isTerritoryHolder = (
	actor: TerritoryActor,
	grant: TerritoryGrant | undefined,
	record: TerritoryRecord,
): boolean => {
	const assignment = record.assignment;
	if (!actor.personId || !assignment) return false;
	if (assignment.personId === actor.personId) return true;
	return !!assignment.groupId && !!grant?.groupIds.includes(assignment.groupId);
};

export const isTerritoryOffered = (grant: TerritoryGrant, record: TerritoryRecord): boolean => {
	if (!grant.dataViews.includes(record.dataView)) return false;
	if (grant.restrictedTypes.includes(record.type)) return false;
	return !record.categories.some((category) => grant.restrictedCategories.includes(category));
};

export const canViewTerritory = (
	actor: TerritoryActor,
	grant: TerritoryGrant | undefined,
	record: TerritoryRecord,
): boolean => {
	if (isTerritoryManager(actor)) return true;
	if (record.deleted) return false;
	if (!grant?.dataViews.includes(record.dataView)) return false;
	if (isTerritoryHolder(actor, grant, record)) return true;
	if (actor.personId && record.requestedBy === actor.personId) return true;
	if (record.history.some((assignment) => assignment.personId === actor.personId)) return true;
	return grant.access !== 'own' && !record.assignment && isTerritoryOffered(grant, record);
};

const coverageDates = (record: TerritoryRecord) => {
	const returned = record.history.filter((item) => item.returnedAt);
	const latest = (dates: string[]) =>
		dates.reduce<string | undefined>(
			(result, date) => (!result || date > result ? date : result),
			undefined,
		);
	return {
		lastReturnedAt: latest(returned.map((item) => item.returnedAt!)),
		lastCompletedAt: latest(
			returned
				.filter((item) => item.completed !== false && !item.campaignId)
				.map((item) => item.returnedAt!),
		),
	};
};

export const projectTerritory = (
	actor: TerritoryActor,
	grant: TerritoryGrant | undefined,
	record: TerritoryRecord,
) => {
	const dates = coverageDates(record);
	if (isTerritoryManager(actor))
		return {
			...dates,
			...structuredClone(record),
			inUse: !!record.assignment,
			requestPending: !!record.requestedBy,
		};
	const holder = isTerritoryHolder(actor, grant, record);
	return {
		...record,
		...dates,
		inUse: !!record.assignment,
		requestPending: !!record.requestedBy,
		privateContent: holder ? record.privateContent : '',
		doNotCalls: holder ? record.doNotCalls : [],
		requestedBy: record.requestedBy === actor.personId ? record.requestedBy : undefined,
		assignment: holder ? record.assignment : undefined,
		history: record.history.filter((assignment) => assignment.personId === actor.personId),
	};
};

export const requireRequestPermission = (
	actor: TerritoryActor,
	policy: TerritoryPolicy,
	record: TerritoryRecord,
): void => {
	const grant = getTerritoryGrant(actor, policy);
	if (
		!actor.personId ||
		!actor.roles.includes('publisher') ||
		!grant?.eligible ||
		grant.access !== 'request'
	) {
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	}
	if (!isTerritoryOffered(grant, record)) throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (record.cardLost || record.assignment || record.requestedBy)
		throw new TerritoryError('TERRITORY_CONFLICT');
};
