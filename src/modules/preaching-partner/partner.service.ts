import { CongregationsList, isCongregationMember } from '#modules/congregations/index.js';
import { UsersList } from '#modules/users/index.js';
import { partnerRepository } from './partner.repository.js';
import { applyPartnerMutation } from './partner.policy.js';
import { PartnerError, type PartnerMutation } from './partner.types.js';

/** Caller identity comes from the authenticated membership, never the request payload. */
export const resolvePartnerContext = (userId: string, congregationId: string) => {
	const user = UsersList.findById(userId);
	const congregation = CongregationsList.findById(congregationId);
	const membership = user?.profile.congregation;
	if (!congregation || membership?.id !== congregationId) throw new PartnerError('PARTNER_FORBIDDEN', 403);
	if (!isCongregationMember(congregation, userId) || !membership.user_local_uid) throw new PartnerError('PARTNER_FORBIDDEN', 403);
	if (!congregation.settings.data_sync.value) throw new PartnerError('PARTNER_FORBIDDEN', 403);
	return { actor: membership.user_local_uid, congregationId };
};

export const createPartnerService = (repository = partnerRepository, resolveContext = resolvePartnerContext) => ({
	list: async (userId: string, congregationId: string) => {
		resolveContext(userId, congregationId);
		return (await repository.read(congregationId)).requests;
	},
	mutate: async (userId: string, congregationId: string, mutation: PartnerMutation) => {
		const { actor } = resolveContext(userId, congregationId);
		return repository.mutate(congregationId, (state) => {
			if (resolveContext(userId, congregationId).actor !== actor) throw new PartnerError('PARTNER_FORBIDDEN', 403);
			const { state: updated, changes } = applyPartnerMutation(state, mutation, actor);
			return { state: updated, result: changes };
		});
	},
});

export const partnerService = createPartnerService();
