export const isTerritoryId = (value: unknown): value is string =>
	typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export const isObject = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === 'object' && !Array.isArray(value);

export const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]): boolean =>
	Object.keys(value).every((key) => keys.includes(key));

export const isRevision = (value: unknown): value is number =>
	Number.isSafeInteger(value) && Number(value) >= 0;

export const isIds = (value: unknown): value is string[] =>
	Array.isArray(value) &&
	value.length <= 100 &&
	value.every(isTerritoryId) &&
	new Set(value).size === value.length;

/** Content is opaque to the server. Require the existing AES transport envelope, never accept accidental plaintext. */
export const isEncryptedContent = (value: unknown): value is string =>
	typeof value === 'string' &&
	value.length <= 262144 &&
	/^U2FsdGVkX1[A-Za-z0-9+/=]{22,}$/.test(value);

export const isOptionalId = (value: unknown): boolean =>
	value === undefined || isTerritoryId(value);
export const isOptionalContent = (value: unknown): boolean =>
	value === undefined || isEncryptedContent(value);
