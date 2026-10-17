import assert from 'node:assert/strict';
import { it } from 'node:test';
import { User } from '#modules/users/user.js';
import { updateLinkedProfileNames } from '#modules/congregation-administration/services/linked-profile-names.js';

it('updates a middle name alone without changing other field timestamps', () => {
	const { profile } = new User('test');
	const input = { firstname: profile.firstname.value, lastname: profile.lastname.value, middlename: 'Marie' };
	const next = updateLinkedProfileNames(profile, input, 'now')!;
	assert.deepEqual(next.middlename, { value: 'Marie', updatedAt: 'now' });
	assert.deepEqual(next.firstname, profile.firstname);
	assert.equal(profile.middlename, undefined);
	assert.equal(updateLinkedProfileNames(next, input, 'later'), undefined);
	assert.equal(updateLinkedProfileNames(next, { firstname: input.firstname, lastname: input.lastname }, 'later'), undefined);
	assert.deepEqual(updateLinkedProfileNames(next, { ...input, middlename: '' }, 'later')?.middlename, { value: '', updatedAt: 'later' });
});
