import { UserProfile } from './user.js';

export const schemaUserProfile = {
	firstname: { updatedAt: '', value: '' },
	lastname: { updatedAt: '', value: '' },
	role: 'pocket',
} satisfies UserProfile;
