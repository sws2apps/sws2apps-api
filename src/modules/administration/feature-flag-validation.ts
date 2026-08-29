import type { FeatureFlag } from '../feature-flags/feature-flag.js';

const allowedAvailability = new Set<FeatureFlag['availability']>(['app', 'user', 'congregation']);

export const isValidFeatureFlagAvailability = (value: unknown) => {
	return typeof value === 'string' && allowedAvailability.has(value as FeatureFlag['availability']);
};
