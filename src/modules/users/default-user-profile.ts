import type { UserProfile } from '../../v3/definition/user.js';

export const schemaUserProfile = {
	firstname: { updatedAt: '', value: '' },
	lastname: { updatedAt: '', value: '' },
	role: 'pocket',
} satisfies UserProfile;
