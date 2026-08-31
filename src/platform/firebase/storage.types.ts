export type StorageBaseType = {
	type: 'congregation' | 'user' | 'api';
	path: string;
};

export type StorageFileListOptions = StorageBaseType & {
	includeContents?: boolean;
	pathIncludes?: string;
};

export type StorageFileEntry = {
	path: string;
	updatedAt: string;
	contents?: string;
};
