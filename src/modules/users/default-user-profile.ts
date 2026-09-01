import type { UserProfile } from './types/user.types.js';

export const schemaUserProfile = {
	firstname: { updatedAt: '', value: '' },
	lastname: { updatedAt: '', value: '' },
	role: 'pocket',
} satisfies UserProfile;
