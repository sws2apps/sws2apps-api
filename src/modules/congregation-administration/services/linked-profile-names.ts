import type { UserProfile } from '#modules/users/index.js';

export const updateLinkedProfileNames = (
	profile: UserProfile,
	input: { firstname: string; lastname: string; middlename?: string },
	updatedAt: string,
	personChanged = false,
): UserProfile | undefined => {
	const names = personChanged && input.middlename === undefined ? { ...input, middlename: '' } : input;
	const fields = ['firstname', 'middlename', 'lastname'] as const;
	const changed = fields.filter((field) => names[field] !== undefined && names[field] !== profile[field]?.value);
	if (changed.length === 0) return undefined;
	const next = structuredClone(profile);
	for (const field of changed) next[field] = { value: names[field]!, updatedAt };
	return next;
};
