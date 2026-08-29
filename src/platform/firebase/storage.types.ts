export type StorageBaseType = {
	type: 'congregation' | 'user' | 'api';
	path: string;
};

export type StorageCongregation = {
	cong_discoverable?: { value: boolean; updatedAt: string };
	last_backup?: string;
};
