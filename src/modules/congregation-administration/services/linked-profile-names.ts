import type { UserProfile } from '#modules/users/index.js';

export const updateLinkedProfileNames = (
	profile: UserProfile,
	input: { firstname: string; lastname: string; middlename?: string },
	updatedAt: string,
): UserProfile | undefined => {
	const fields = ['firstname', 'middlename', 'lastname'] as const;
	const changed = fields.filter((field) => input[field] !== undefined && input[field] !== profile[field]?.value);
	if (changed.length === 0) return undefined;
	const next = structuredClone(profile);
	for (const field of changed) next[field] = { value: input[field]!, updatedAt };
	return next;
};
