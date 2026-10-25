import {
	CongregationsList,
	getUpcomingEvents,
	getCongregationPersons,
} from '#modules/congregations/index.js';
import type { User } from '#modules/users/index.js';
import { readTerritories, writeTerritories } from '../repositories/territory.repository.js';
import {
	canViewTerritory,
	getTerritoryGrant,
	isTerritoryManager,
	projectTerritory,
	requireTerritoryManager,
} from '../territory-policy.js';
import { TerritoryError } from '../territory.types.js';
import type { TerritoryActor, TerritoryCommand, TerritoryPolicy } from '../territory.types.js';
import { applyTerritoryCommand } from './territory-commands.js';

export type TerritoryOperations = {
	read: typeof readTerritories;
	write: typeof writeTerritories;
	getEvents: typeof getUpcomingEvents;
	getPersons: typeof getCongregationPersons;
	now: () => string;
};

const defaultOperations: TerritoryOperations = {
	read: readTerritories,
	write: writeTerritories,
	getEvents: getUpcomingEvents,
	getPersons: getCongregationPersons,
	now: () => new Date().toISOString(),
};

/** The actor is derived from the authenticated account, never from submitted identity fields. */
export const resolveTerritoryActor = (user: User, congregationId: string): TerritoryActor => {
	const membership = user.profile.congregation;
	if (membership?.id !== congregationId) throw new TerritoryError('UNAUTHORIZED_ACCESS');
	const congregation = CongregationsList.findById(congregationId);
	if (!congregation?.settings.data_sync.value) throw new TerritoryError('UNAUTHORIZED_ACCESS');
	if (!congregation.members.some((member) => member.id === user.id))
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	return { congregationId, personId: membership.user_local_uid, roles: membership.cong_role };
};

/** A complete authorized snapshot. Clients must replace their visible set, removing records whose access was revoked. */
export const retrieveTerritories = async (
	actor: TerritoryActor,
	operations: TerritoryOperations = defaultOperations,
) => {
	const { state } = await operations.read(actor.congregationId);
	const manager = isTerritoryManager(actor);
	const grant = getTerritoryGrant(actor, state.policy);
	return {
		revision: state.revision,
		policy: manager
			? state.policy
			: {
					revision: state.policy.revision,
					content: state.policy.content,
					grants: grant ? [grant] : [],
				},
		records: state.records
			.filter((record) => canViewTerritory(actor, grant, record))
			.map((record) => projectTerritory(actor, grant, record)),
	};
};

export const updateTerritoryPolicy = async (
	actor: TerritoryActor,
	policy: TerritoryPolicy,
	operations: TerritoryOperations = defaultOperations,
): Promise<void> => {
	requireTerritoryManager(actor);
	const { state, generation } = await operations.read(actor.congregationId);
	if (policy.revision !== state.policy.revision) throw new TerritoryError('TERRITORY_CONFLICT');
	const persons = await operations.getPersons(actor.congregationId);
	const personIds = new Set(persons.map((person) => person.person_uid));
	if (policy.grants.some((grant) => !personIds.has(grant.personId)))
		throw new TerritoryError('INPUT_INVALID');
	state.policy = { ...policy, revision: policy.revision + 1 };
	state.revision += 1;
	await operations.write(actor.congregationId, generation, state);
};

const validateCampaign = async (
	actor: TerritoryActor,
	command: TerritoryCommand,
	operations: TerritoryOperations,
): Promise<void> => {
	if (command.action !== 'assign' || !command.campaignId) return;
	const events = await operations.getEvents(actor.congregationId);
	if (!events.some((event) => event.event_uid === command.campaignId))
		throw new TerritoryError('INPUT_INVALID');
};

export const executeTerritoryCommand = async (
	actor: TerritoryActor,
	id: string,
	command: TerritoryCommand,
	operations: TerritoryOperations = defaultOperations,
) => {
	if (command.action === 'assign') requireTerritoryManager(actor);
	await validateCampaign(actor, command, operations);
	const { state, generation } = await operations.read(actor.congregationId);
	const grant = getTerritoryGrant(actor, state.policy);
	const previous = state.records.find((record) => record.id === id);
	if (previous && !canViewTerritory(actor, grant, previous))
		throw new TerritoryError('UNAUTHORIZED_ACCESS');
	const result = applyTerritoryCommand(state, actor, id, command, operations.now());
	await operations.write(actor.congregationId, generation, state);
	return { revision: state.revision, record: projectTerritory(actor, grant, result) };
};

/** Map splits and combinations commit all affected records together, including source tombstones. */
export const executeTerritoryBatch = async (
	actor: TerritoryActor,
	batch: { expectedRevision: number; commands: { id: string; command: TerritoryCommand }[] },
	operations: TerritoryOperations = defaultOperations,
) => {
	requireTerritoryManager(actor);
	const { state, generation } = await operations.read(actor.congregationId);
	if (state.revision !== batch.expectedRevision) throw new TerritoryError('TERRITORY_CONFLICT');
	const now = operations.now();
	for (const { id, command } of batch.commands) {
		if (command.action !== 'update' && command.action !== 'delete')
			throw new TerritoryError('INPUT_INVALID');
		applyTerritoryCommand(state, actor, id, command, now);
	}
	await operations.write(actor.congregationId, generation, state);
	return { revision: state.revision };
};
