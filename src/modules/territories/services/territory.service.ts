import { createHash } from 'node:crypto';
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
	return {
		congregationId,
		userId: user.id,
		personId: membership.user_local_uid,
		roles: membership.cong_role,
	};
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

const commandCampaign = (command: TerritoryCommand) => {
	if (command.action === 'assign') return command.campaignId;
	if (command.action === 'reconcile') return command.assignment?.campaignId;
	return undefined;
};

const validateCampaigns = async (
	actor: TerritoryActor,
	commands: TerritoryCommand[],
	operations: TerritoryOperations,
): Promise<void> => {
	const ids = commands.map(commandCampaign).filter((id) => id !== undefined);
	if (!ids.length) return;
	requireTerritoryManager(actor);
	const events = await operations.getEvents(actor.congregationId);
	const known = new Set(events.map((event) => event.event_uid));
	if (ids.some((id) => !known.has(id))) throw new TerritoryError('INPUT_INVALID');
};

export const executeTerritoryCommand = async (
	actor: TerritoryActor,
	id: string,
	command: TerritoryCommand,
	operations: TerritoryOperations = defaultOperations,
) => {
	if (command.action === 'assign') requireTerritoryManager(actor);
	await validateCampaigns(actor, [command], operations);
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
	batch: {
		expectedRevision: number;
		operationId?: string;
		commands: { id: string; command: TerritoryCommand }[];
	},
	operations: TerritoryOperations = defaultOperations,
) => {
	const { state, generation } = await operations.read(actor.congregationId);
	const digest = createHash('sha256').update(JSON.stringify(batch)).digest('hex');
	const actorId = actor.userId ?? actor.personId ?? '';
	const receipt = state.receipts?.find(
		(item) => item.id === batch.operationId && item.actor === actorId,
	);
	if (receipt) {
		if (receipt.digest !== digest) throw new TerritoryError('INPUT_INVALID');
		return { revision: state.revision };
	}
	if (state.revision !== batch.expectedRevision) throw new TerritoryError('TERRITORY_CONFLICT');
	const now = operations.now();
	const grant = getTerritoryGrant(actor, state.policy);
	await validateCampaigns(
		actor,
		batch.commands.map((item) => item.command),
		operations,
	);
	for (const { id, command } of batch.commands) {
		const record = state.records.find((item) => item.id === id);
		if (record && !canViewTerritory(actor, grant, record))
			throw new TerritoryError('UNAUTHORIZED_ACCESS');
		applyTerritoryCommand(state, actor, id, command, now);
	}
	if (batch.operationId)
		state.receipts = [
			...(state.receipts ?? []),
			{ id: batch.operationId, actor: actorId, digest },
		].slice(-256);
	await operations.write(actor.congregationId, generation, state);
	return { revision: state.revision };
};
